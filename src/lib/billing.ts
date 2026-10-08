import Stripe from "stripe";
import { nanoid } from "nanoid";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { PLANS, PLAN_IDS, isPlanId, planPrice, type BillingInterval, type PlanId } from "./plans";
import { accessState, addYear, coveredUntil } from "./subscription";

/*
 * Stripe, with a simulated fallback.
 *
 * With STRIPE_SECRET_KEY set this is a real Checkout / webhook / Customer
 * Portal integration. Without it, checkout activates the plan locally so the
 * whole signup -> plan -> editor flow is testable before any Stripe account
 * exists. Adding the keys switches modes with no code change.
 *
 * Two ways to pay, because of the Polish market (see README):
 *  - A subscription, card only: Przelewy24 cannot recur at all and recurring
 *    BLIK is still Stripe private preview.
 *  - A prepaid year, paid once with BLIK, Przelewy24 or card. It does not
 *    renew; the owner pays again when the year runs out.
 */

export const stripeEnabled = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY);

let client: Stripe | null = null;

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

const DAY = 24 * 60 * 60 * 1000;

/** Stripe refuses a trial_end less than 48 hours away. */
const MIN_TRIAL_MS = 49 * 60 * 60 * 1000;

function priceId(plan: PlanId, interval: BillingInterval): string | undefined {
  const config = PLANS[plan];
  return interval === "monthly" ? config.stripePriceMonthly : config.stripePriceYearly;
}

/** Which of our plans a configured Stripe price belongs to. */
function planForPrice(id: string | undefined): PlanId | null {
  if (!id) return null;
  return (
    PLAN_IDS.find((plan) => PLANS[plan].stripePriceMonthly === id || PLANS[plan].stripePriceYearly === id) ??
    null
  );
}

type OrgBilling = {
  status: string;
  stripeSubscriptionId: string | null;
};

/**
 * True while a Stripe subscription is running. A prepaid year must not be sold
 * on top of it, or the owner would pay twice for the same months.
 */
export function hasLiveSubscription(org: OrgBilling): boolean {
  return Boolean(org.stripeSubscriptionId) && ["trialing", "active", "past_due"].includes(org.status);
}

async function ensureCustomer(orgId: string, email: string): Promise<string> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (org.stripeCustomerId) return org.stripeCustomerId;

  const customer = await stripe().customers.create({ email, metadata: { orgId } });
  await db.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export type CheckoutResult =
  | { mode: "stripe"; url: string }
  | { mode: "simulated"; url: string }
  | { mode: "refused"; reason: "has-subscription" };

type CheckoutInput = {
  orgId: string;
  email: string;
  plan: PlanId;
  successUrl: string;
  cancelUrl: string;
};

/* ------------------------------------------------------------------ */
/* Subscription (card, renews automatically)                           */
/* ------------------------------------------------------------------ */

export async function startCheckout({
  orgId,
  email,
  plan,
  interval,
  successUrl,
  cancelUrl,
}: CheckoutInput & { interval: BillingInterval }): Promise<CheckoutResult> {
  if (!stripeEnabled()) {
    await activateSimulated(orgId, plan, interval);
    return { mode: "simulated", url: successUrl };
  }

  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  const customerId = await ensureCustomer(orgId, email);

  const existing = priceId(plan, interval);
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = existing
    ? { price: existing, quantity: 1 }
    : {
        // No price configured yet: build one inline so checkout still works.
        quantity: 1,
        price_data: {
          currency: "pln",
          unit_amount: planPrice(PLANS[plan], interval),
          recurring: { interval: interval === "monthly" ? "month" : "year" },
          product_data: { name: `StayGuide ${plan}` },
        },
      };

  // Billing starts when what the owner already has runs out: the rest of the
  // trial or of a prepaid year. Never a second trial on top.
  const until = coveredUntil(org);
  const trialEnd =
    until && until.getTime() - Date.now() > MIN_TRIAL_MS ? Math.floor(until.getTime() / 1000) : undefined;

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [lineItem],
    subscription_data: { trial_end: trialEnd, metadata: { orgId, plan } },
    // The trial is advertised as "no card required", so do not demand one.
    payment_method_collection: "if_required",
    // Business customers need their NIP on the invoice.
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto" },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orgId, plan, interval, kind: "subscription" },
  });

  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return { mode: "stripe", url: session.url };
}

/** Simulated mode: grant the plan directly so the flow can be exercised. */
async function activateSimulated(orgId: string, plan: PlanId, interval: BillingInterval) {
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  const now = new Date();
  const until = coveredUntil(org, now);
  const periodEnd = (from: Date) =>
    interval === "monthly" ? new Date(from.getTime() + 30 * DAY) : addYear(from);

  if (until) {
    // Like Stripe with trial_end: chosen now, first charge when cover runs out.
    await db.organization.update({
      where: { id: orgId },
      data: { plan, billingInterval: interval, status: "trialing", trialEndsAt: until, currentPeriodEnd: periodEnd(until) },
    });
    return;
  }

  await db.$transaction([
    db.organization.update({
      where: { id: orgId },
      data: { plan, billingInterval: interval, status: "active", currentPeriodEnd: periodEnd(now) },
    }),
    db.payment.create({
      data: {
        orgId,
        externalId: `sim_${nanoid(12)}`,
        kind: "subscription",
        plan,
        interval,
        amount: planPrice(PLANS[plan], interval),
        method: "simulated",
      },
    }),
  ]);
}

/* ------------------------------------------------------------------ */
/* Prepaid year (BLIK / Przelewy24 / card, does not renew)             */
/* ------------------------------------------------------------------ */

export async function startPrepaidCheckout({
  orgId,
  email,
  plan,
  successUrl,
  cancelUrl,
}: CheckoutInput): Promise<CheckoutResult> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (hasLiveSubscription(org)) return { mode: "refused", reason: "has-subscription" };

  const amount = planPrice(PLANS[plan], "yearly");

  if (!stripeEnabled()) {
    await grantPrepaid({ orgId, plan, externalId: `sim_${nanoid(12)}`, amount, method: "simulated" });
    return { mode: "simulated", url: successUrl };
  }

  const customerId = await ensureCustomer(orgId, email);
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    payment_method_types: ["blik", "p24", "card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "pln",
          unit_amount: amount,
          product_data: { name: `StayGuide ${plan} — 12 months` },
        },
      },
    ],
    // A proper invoice for the payment, with the business's NIP on it.
    invoice_creation: { enabled: true },
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto" },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orgId, plan, kind: "prepaid" },
  });

  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return { mode: "stripe", url: session.url };
}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

/**
 * Records a prepaid year and extends access by it. Idempotent on externalId:
 * Stripe may deliver the same webhook more than once, and a year must be
 * granted exactly once per payment.
 *
 * The year starts when current cover ends -- the rest of a trial or of an
 * earlier prepaid year -- so paying early never loses days.
 */
export async function grantPrepaid({
  orgId,
  plan,
  externalId,
  amount,
  method = null,
  receiptUrl = null,
}: {
  orgId: string;
  plan: PlanId;
  externalId: string;
  amount: number;
  method?: string | null;
  receiptUrl?: string | null;
}): Promise<"granted" | "duplicate"> {
  if (await db.payment.findUnique({ where: { externalId }, select: { id: true } })) return "duplicate";

  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  const now = new Date();
  const from = coveredUntil(org, now) ?? now;

  try {
    await db.$transaction([
      db.payment.create({
        data: { orgId, externalId, kind: "prepaid", plan, interval: "yearly", amount, method, receiptUrl },
      }),
      db.organization.update({
        where: { id: orgId },
        data: { plan, billingInterval: "yearly", status: "prepaid", currentPeriodEnd: addYear(from) },
      }),
    ]);
  } catch (error) {
    // Two deliveries racing: the other one already granted it.
    if (isUniqueViolation(error)) return "duplicate";
    throw error;
  }
  return "granted";
}

/* ------------------------------------------------------------------ */
/* Customer Portal and cancellation                                    */
/* ------------------------------------------------------------------ */

export async function portalUrl(orgId: string, returnUrl: string): Promise<string | null> {
  if (!stripeEnabled()) return null;

  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (!org.stripeCustomerId) return null;

  const session = await stripe().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  });
  return session.url;
}

/** Stops a running Stripe subscription immediately, e.g. when an account is deleted. */
export async function cancelSubscriptionNow(orgId: string): Promise<void> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (!stripeEnabled() || !hasLiveSubscription(org) || !org.stripeSubscriptionId) return;
  await stripe().subscriptions.cancel(org.stripeSubscriptionId);
}

/* ------------------------------------------------------------------ */
/* Webhooks                                                            */
/* ------------------------------------------------------------------ */

export function constructWebhookEvent(payload: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe().webhooks.constructEvent(payload, signature, secret);
}

/** Maps a Stripe subscription status onto our own. */
function mapStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "trialing";
  }
}

const customerIdOf = (customer: string | { id: string } | null): string | null =>
  customer === null ? null : typeof customer === "string" ? customer : customer.id;

export async function applySubscriptionEvent(subscription: Stripe.Subscription): Promise<void> {
  const customerId = customerIdOf(subscription.customer);
  if (!customerId) return;

  const org = await db.organization.findFirst({ where: { stripeCustomerId: customerId } });
  if (!org) return;

  const item = subscription.items.data[0];
  const periodEnd = item?.current_period_end ?? null;

  // The price decides the plan, so a switch made in the Customer Portal is
  // picked up; the checkout metadata is the fallback for inline prices.
  const metadataPlan = subscription.metadata?.plan;
  const plan = planForPrice(item?.price.id) ?? (isPlanId(metadataPlan) ? metadataPlan : org.plan);

  // A subscription that ended while a prepaid year still runs must not cut
  // that year short.
  const status = mapStatus(subscription.status);
  if (status === "canceled" && accessState(org).kind === "prepaid") return;

  await db.organization.update({
    where: { id: org.id },
    data: {
      stripeSubscriptionId: subscription.id,
      status,
      plan,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : org.trialEndsAt,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : org.currentPeriodEnd,
      billingInterval:
        item?.price.recurring?.interval === "year"
          ? "yearly"
          : item?.price.recurring?.interval === "month"
            ? "monthly"
            : org.billingInterval,
    },
  });
}

/** A paid prepaid-year checkout. Called for both instant and delayed methods. */
export async function applyCheckoutPaid(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "payment" || session.payment_status !== "paid") return;
  if (session.metadata?.kind !== "prepaid") return;

  const orgId = session.metadata.orgId;
  const plan = session.metadata.plan;
  if (!orgId || !isPlanId(plan)) return;
  if (!(await db.organization.findUnique({ where: { id: orgId }, select: { id: true } }))) return;

  // Which method was used and where the invoice lives are nice to have;
  // failing to fetch them must never block granting what was paid for.
  let method: string | null = null;
  let receiptUrl: string | null = null;
  try {
    const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (intentId) {
      const intent = await stripe().paymentIntents.retrieve(intentId, { expand: ["payment_method"] });
      const pm = intent.payment_method;
      method = pm && typeof pm !== "string" ? pm.type : null;
    }
    const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id;
    if (invoiceId) receiptUrl = (await stripe().invoices.retrieve(invoiceId)).hosted_invoice_url ?? null;
  } catch {
    /* recorded without the extras */
  }

  await grantPrepaid({
    orgId,
    plan,
    externalId: session.id,
    amount: session.amount_total ?? planPrice(PLANS[plan], "yearly"),
    method,
    receiptUrl,
  });
}

/** Records a paid subscription invoice in the owner's payment history. */
export async function recordInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // Trial and prepaid-cover periods produce zero-amount invoices; not payments.
  if (!invoice.id || invoice.amount_paid <= 0) return;

  const customerId = customerIdOf(invoice.customer);
  if (!customerId) return;
  const org = await db.organization.findFirst({ where: { stripeCustomerId: customerId } });
  if (!org) return;

  try {
    await db.payment.create({
      data: {
        orgId: org.id,
        externalId: invoice.id,
        kind: "subscription",
        plan: org.plan ?? "one",
        interval: org.billingInterval ?? "monthly",
        amount: invoice.amount_paid,
        currency: invoice.currency,
        method: "card",
        receiptUrl: invoice.hosted_invoice_url ?? null,
      },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
}

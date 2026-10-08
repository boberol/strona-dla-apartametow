/*
 * Plan catalogue.
 *
 * Prices are in grosze (PLN minor units) and quoted NET, matching how this
 * market sells to businesses. VAT is added at checkout by Stripe Tax; the
 * actual faktura is issued by a KSeF-integrated provider (see README).
 *
 * Everything about pricing lives here so changing it is a one-file edit.
 */

export const PLAN_IDS = ["one", "complex", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const BILLING_INTERVALS = ["monthly", "yearly"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export type Plan = {
  id: PlanId;
  /** Net price in grosze. */
  monthly: number;
  yearly: number;
  maxProperties: number;
  /** Stripe price ids, when running against real Stripe. */
  stripePriceMonthly?: string;
  stripePriceYearly?: string;
  featureKeys: string[];
};

export const TRIAL_DAYS = 14;

export const PLANS: Record<PlanId, Plan> = {
  one: {
    id: "one",
    monthly: 4900,
    yearly: 49000,
    maxProperties: 1,
    stripePriceMonthly: process.env.STRIPE_PRICE_ONE_MONTHLY,
    stripePriceYearly: process.env.STRIPE_PRICE_ONE_YEARLY,
    featureKeys: ["branded", "issueForm", "reviews"],
  },
  complex: {
    id: "complex",
    monthly: 14900,
    yearly: 149000,
    maxProperties: 5,
    stripePriceMonthly: process.env.STRIPE_PRICE_COMPLEX_MONTHLY,
    stripePriceYearly: process.env.STRIPE_PRICE_COMPLEX_YEARLY,
    featureKeys: ["multiUnit", "oneQr", "issueRoom"],
  },
  pro: {
    id: "pro",
    monthly: 19900,
    yearly: 199000,
    maxProperties: 25,
    stripePriceMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    featureKeys: ["manyProperties", "separateQr", "separateForms", "consistent"],
  },
};

export const isPlanId = (value: unknown): value is PlanId =>
  typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);

export const isBillingInterval = (value: unknown): value is BillingInterval =>
  typeof value === "string" && (BILLING_INTERVALS as readonly string[]).includes(value);

export function planPrice(plan: Plan, interval: BillingInterval): number {
  return interval === "monthly" ? plan.monthly : plan.yearly;
}

/** Yearly billed as ~10 months, so the saving is worth showing on the page. */
export function yearlySavingMonths(plan: Plan): number {
  return Math.round((plan.monthly * 12 - plan.yearly) / plan.monthly);
}

export function formatPln(grosze: number, locale: string): string {
  return new Intl.NumberFormat(locale === "pl" ? "pl-PL" : locale === "es" ? "es-ES" : "en-GB", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(grosze / 100);
}

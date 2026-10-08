import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  applyCheckoutPaid,
  applySubscriptionEvent,
  constructWebhookEvent,
  recordInvoicePaid,
  stripeEnabled,
} from "@/lib/billing";

/**
 * Stripe is the source of truth for payment state; this is the only place it
 * writes into ours. The signature check matters: without it anyone could POST
 * here and grant themselves a subscription.
 *
 * Events to enable on the endpoint (README, "Going live with payments"):
 * customer.subscription.created / updated / deleted, checkout.session.completed,
 * checkout.session.async_payment_succeeded, invoice.paid.
 */
export async function POST(request: Request) {
  if (!stripeEnabled()) {
    return NextResponse.json({ error: "stripe-not-configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "no-signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(await request.text(), signature);
  } catch {
    return NextResponse.json({ error: "bad-signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscriptionEvent(event.data.object);
      break;

    // A prepaid year. BLIK and cards confirm at once; Przelewy24 can confirm
    // later, which arrives as async_payment_succeeded. Both are idempotent.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await applyCheckoutPaid(event.data.object);
      break;

    case "invoice.paid":
      await recordInvoicePaid(event.data.object);
      break;

    default:
      // Everything else is acknowledged and ignored, so Stripe stops retrying.
      break;
  }

  return NextResponse.json({ received: true });
}

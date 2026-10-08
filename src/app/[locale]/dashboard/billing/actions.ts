"use server";

import { redirect } from "next/navigation";
import { currentOrg } from "@/lib/guard";
import { portalUrl, startCheckout, startPrepaidCheckout } from "@/lib/billing";
import { isBillingInterval, isPlanId } from "@/lib/plans";
import { appUrl } from "@/lib/urls";

/** Card subscription that renews by itself. */
export async function subscribe(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const plan = formData.get("plan");
  const interval = formData.get("interval");

  const session = await currentOrg();
  if (!session) redirect(`/${locale}/login`);
  if (!isPlanId(plan) || !isBillingInterval(interval)) {
    redirect(`/${locale}/dashboard/billing?error=plan`);
  }

  const result = await startCheckout({
    orgId: session.org.id,
    email: session.user.email,
    plan,
    interval,
    successUrl: appUrl(`/${locale}/dashboard/billing?subscribed=1`),
    cancelUrl: appUrl(`/${locale}/dashboard/billing?canceled=1`),
  });

  // Simulated mode already granted the plan; real Stripe hands back a hosted
  // checkout page to send the owner to.
  if (result.mode === "refused") redirect(`/${locale}/dashboard/billing?error=${result.reason}`);
  redirect(result.mode === "simulated" ? `/${locale}/dashboard/billing?simulated=1` : result.url);
}

/** One year paid once, with BLIK, Przelewy24 or a card. */
export async function payOnce(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const plan = formData.get("plan");

  const session = await currentOrg();
  if (!session) redirect(`/${locale}/login`);
  if (!isPlanId(plan)) redirect(`/${locale}/dashboard/billing?error=plan`);

  const result = await startPrepaidCheckout({
    orgId: session.org.id,
    email: session.user.email,
    plan,
    successUrl: appUrl(`/${locale}/dashboard/billing?paid=1`),
    cancelUrl: appUrl(`/${locale}/dashboard/billing?canceled=1`),
  });

  if (result.mode === "refused") redirect(`/${locale}/dashboard/billing?error=${result.reason}`);
  redirect(result.mode === "simulated" ? `/${locale}/dashboard/billing?paid=1&simulated=1` : result.url);
}

export async function openPortal(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const session = await currentOrg();
  if (!session) redirect(`/${locale}/login`);

  const url = await portalUrl(session.org.id, appUrl(`/${locale}/dashboard/billing`));
  redirect(url ?? `/${locale}/dashboard/billing?error=portal`);
}

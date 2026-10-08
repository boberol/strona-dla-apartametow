"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentAdmin } from "@/lib/guard";
import { hasLiveSubscription } from "@/lib/billing";
import { requestPasswordReset } from "@/lib/password-reset";
import { isPlanId } from "@/lib/plans";
import { addYear, coveredUntil } from "@/lib/subscription";

/*
 * Support actions for platform admins. Each one re-checks the admin flag --
 * a server action is a public endpoint, whatever page rendered its button --
 * and leaves an audit line in the server log.
 */

const DAY = 24 * 60 * 60 * 1000;

async function context(formData: FormData) {
  const admin = await currentAdmin();
  if (!admin) notFound();
  const locale = String(formData.get("locale") ?? "en");
  const orgId = String(formData.get("orgId") ?? "");
  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) notFound();
  const back = `/${locale}/admin/accounts/${org.id}`;
  const audit = (what: string) => console.info(`[admin] ${admin.email} ${what} (org ${org.id} "${org.name}")`);
  return { admin, org, back, audit };
}

function done(back: string, key: string): never {
  revalidatePath(back);
  redirect(`${back}?done=${key}`);
}

export async function extendTrial(formData: FormData) {
  const { org, back, audit } = await context(formData);
  if (hasLiveSubscription(org)) redirect(`${back}?error=stripe`);

  const from = Math.max(Date.now(), org.trialEndsAt?.getTime() ?? 0);
  await db.organization.update({
    where: { id: org.id },
    data: { status: "trialing", trialEndsAt: new Date(from + 14 * DAY) },
  });
  audit("extended the trial by 14 days");
  done(back, "trial");
}

/** A year on the house: support goodwill, partners, testing. Records no payment. */
export async function grantFreeYear(formData: FormData) {
  const { org, back, audit } = await context(formData);
  const plan = formData.get("plan");
  if (!isPlanId(plan)) redirect(`${back}?error=plan`);
  if (hasLiveSubscription(org)) redirect(`${back}?error=stripe`);

  const from = coveredUntil(org) ?? new Date();
  await db.organization.update({
    where: { id: org.id },
    data: { status: "prepaid", plan, billingInterval: "yearly", currentPeriodEnd: addYear(from) },
  });
  audit(`granted a free year of ${plan}`);
  done(back, "year");
}

/** Stops editing. Guest sites stay online, as for any lapsed account. */
export async function endAccess(formData: FormData) {
  const { org, back, audit } = await context(formData);
  if (hasLiveSubscription(org)) redirect(`${back}?error=stripe`);

  await db.organization.update({ where: { id: org.id }, data: { status: "canceled" } });
  audit("ended access");
  done(back, "ended");
}

export async function sendPasswordReset(formData: FormData) {
  const { back, audit } = await context(formData);
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  await requestPasswordReset(user.email);
  audit(`sent a password reset link to ${user.email}`);
  done(back, "reset");
}

export async function setAdmin(formData: FormData) {
  const { admin, back, audit } = await context(formData);
  const userId = String(formData.get("userId") ?? "");
  const makeAdmin = formData.get("admin") === "1";

  // Nobody can remove their own access by accident and lock the area out.
  if (userId === admin.id) redirect(`${back}?error=self`);

  const user = await db.user.update({ where: { id: userId }, data: { isAdmin: makeAdmin } });
  audit(`${makeAdmin ? "made" : "removed"} ${user.email} ${makeAdmin ? "an admin" : "as admin"}`);
  done(back, makeAdmin ? "admin-on" : "admin-off");
}

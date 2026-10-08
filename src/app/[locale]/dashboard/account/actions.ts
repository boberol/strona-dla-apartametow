"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  destroySession,
  getSessionUser,
  hashPassword,
  isEmailShaped,
  normalizeEmail,
  passwordProblem,
  revokeOtherSessions,
  verifyPassword,
} from "@/lib/auth";
import { cancelSubscriptionNow } from "@/lib/billing";

/*
 * Account settings. Anything that could hand the account to someone else --
 * a new email, a new password, deletion -- asks for the current password, so
 * a laptop left signed in is not enough to take the account over.
 */

async function signedIn(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  return { locale, user, record, back: `/${locale}/dashboard/account` };
}

export async function updateProfile(formData: FormData) {
  const { user, back } = await signedIn(formData);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const business = String(formData.get("business") ?? "").trim().slice(0, 80);

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { name: name || null } }),
    ...(business ? [db.organization.update({ where: { id: user.orgId }, data: { name: business } })] : []),
  ]);
  redirect(`${back}?saved=profile`);
}

export async function changeEmail(formData: FormData) {
  const { user, record, back } = await signedIn(formData);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!verifyPassword(password, record.passwordHash)) redirect(`${back}?error=password`);
  if (!isEmailShaped(email)) redirect(`${back}?error=email`);
  if (email === record.email) redirect(back);

  const taken = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) redirect(`${back}?error=email-taken`);

  await db.user.update({ where: { id: user.id }, data: { email } });
  redirect(`${back}?saved=email`);
}

export async function changePassword(formData: FormData) {
  const { user, record, back } = await signedIn(formData);
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!verifyPassword(current, record.passwordHash)) redirect(`${back}?error=password`);
  if (passwordProblem(next)) redirect(`${back}?error=new-password`);

  await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
  // Anyone else holding a session (a lost phone, a shared computer) is out.
  await revokeOtherSessions(user.id);
  redirect(`${back}?saved=password`);
}

export async function deleteAccount(formData: FormData) {
  const { locale, user, record, back } = await signedIn(formData);
  const password = String(formData.get("password") ?? "");
  const typed = normalizeEmail(String(formData.get("confirm") ?? ""));

  if (!verifyPassword(password, record.passwordHash)) redirect(`${back}?error=password`);
  if (typed !== record.email) redirect(`${back}?error=confirm`);

  // Stop billing before the data that ties Stripe to this account disappears.
  const owned = await db.organization.findMany({ where: { ownerId: user.id }, select: { id: true } });
  for (const org of owned) await cancelSubscriptionNow(org.id);

  await destroySession();
  // Organisations the user owns, their apartments, versions, reports and
  // payments all cascade with the user.
  await db.user.delete({ where: { id: user.id } });
  redirect(`/${locale}?goodbye=1`);
}

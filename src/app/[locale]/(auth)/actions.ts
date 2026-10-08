"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  isEmailShaped,
  normalizeEmail,
  passwordProblem,
  pruneExpiredSessions,
  verifyPassword,
} from "@/lib/auth";
import { trialEndDate } from "@/lib/subscription";
import { requestPasswordReset, resetPassword } from "@/lib/password-reset";
import { isBillingInterval, isPlanId } from "@/lib/plans";
import { LOCALES } from "@/site/schema";

/*
 * Errors come back as a query parameter rather than thrown, because a server
 * action that redirects cannot also return a value to the form.
 */

function fail(path: string, code: string): never {
  redirect(`${path}?error=${code}`);
}

/** Carries a chosen plan through signup so checkout can resume afterwards. */
function planQuery(formData: FormData): string {
  const plan = formData.get("plan");
  const interval = formData.get("interval");
  if (!isPlanId(plan) || !isBillingInterval(interval)) return "";
  return `?plan=${plan}&interval=${interval}`;
}

export async function signUp(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const back = `/${locale}/signup${planQuery(formData)}`;

  if (!isEmailShaped(email)) fail(back, "email");
  if (passwordProblem(password)) fail(back, "password");

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) fail(back, "taken");

  const user = await db.user.create({
    data: {
      email,
      name: name || null,
      passwordHash: hashPassword(password),
      locale: (LOCALES as readonly string[]).includes(locale) ? locale : "en",
    },
  });

  // Every account gets an organisation; billing and apartments hang off it.
  const org = await db.organization.create({
    data: {
      name: name || email,
      ownerId: user.id,
      status: "trialing",
      trialEndsAt: trialEndDate(),
    },
  });
  await db.membership.create({ data: { userId: user.id, orgId: org.id, role: "owner" } });

  await createSession(user.id);
  redirect(`/${locale}/onboarding/template${planQuery(formData)}`);
}

export async function signIn(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const back = `/${locale}/login`;

  const user = await db.user.findUnique({ where: { email } });

  // Same message whether the email is unknown or the password is wrong, so the
  // form cannot be used to discover which addresses have accounts.
  if (!user || !verifyPassword(password, user.passwordHash)) fail(back, "credentials");

  await pruneExpiredSessions();
  // Emails go out in the language the owner last used the panel in.
  if ((LOCALES as readonly string[]).includes(locale) && user.locale !== locale) {
    await db.user.update({ where: { id: user.id }, data: { locale } });
  }
  await createSession(user.id);
  redirect(`/${locale}/dashboard`);
}

export async function signOutAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  await destroySession();
  redirect(`/${locale}`);
}

export async function forgotPassword(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const email = String(formData.get("email") ?? "");
  if (isEmailShaped(normalizeEmail(email))) await requestPasswordReset(email);
  // The same answer whether or not the address has an account.
  redirect(`/${locale}/forgot?sent=1`);
}

export async function resetPasswordAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await resetPassword(token, password);
  if (result === "weak") redirect(`/${locale}/reset?token=${encodeURIComponent(token)}&error=password`);
  if (result === "invalid") redirect(`/${locale}/reset?error=invalid`);
  redirect(`/${locale}/login?reset=1`);
}

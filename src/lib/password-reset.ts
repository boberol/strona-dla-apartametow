import { createHash, randomBytes } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { db } from "./db";
import { hashPassword, normalizeEmail, passwordProblem } from "./auth";
import { sendEmail } from "./email";
import { appUrl } from "./urls";
import { LOCALES, type Locale } from "@/site/schema";

/*
 * Password reset by emailed link.
 *
 * Like sessions, only a SHA-256 of the token is stored, so a leaked database
 * cannot be used to reset anyone's password. A link works once, for an hour,
 * and using it signs the account out everywhere.
 */

const RESET_MINUTES = 60;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const asLocale = (value: string): Locale =>
  (LOCALES as readonly string[]).includes(value) ? (value as Locale) : "en";

/**
 * Emails a reset link if the address has an account. Resolves the same way
 * either way, so the form cannot be used to learn who has an account.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email: normalizeEmail(rawEmail) } });
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    // Only the newest link works.
    db.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } }),
    db.passwordReset.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
      },
    }),
  ]);

  const locale = asLocale(user.locale);
  const t = await getTranslations({ locale, namespace: "email" });
  await sendEmail({
    to: user.email,
    subject: t("resetSubject"),
    text: t("resetBody", { url: appUrl(`/${locale}/reset?token=${token}`), minutes: RESET_MINUTES }),
  });
}

/** Whether a link can still be used, so the page can say so before any typing. */
export async function resetTokenValid(token: string): Promise<boolean> {
  if (!token) return false;
  const row = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  return Boolean(row && !row.usedAt && row.expiresAt > new Date());
}

export type ResetResult = "ok" | "invalid" | "weak";

export async function resetPassword(token: string, password: string): Promise<ResetResult> {
  if (passwordProblem(password)) return "weak";

  const row = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt <= new Date()) return "invalid";

  // Marking it used is conditional, so two submits of the same link cannot
  // both succeed.
  const claimed = await db.passwordReset.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) return "invalid";

  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: hashPassword(password) } }),
    // Whoever may have had the old password is signed out everywhere.
    db.session.deleteMany({ where: { userId: row.userId } }),
  ]);
  return "ok";
}

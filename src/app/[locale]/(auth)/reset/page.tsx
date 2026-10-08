import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { resetTokenValid } from "@/lib/password-reset";
import { resetPasswordAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("resetTitle"), robots: { index: false } };
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { token = "", error } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("auth");
  const valid = await resetTokenValid(token);

  if (!valid) {
    return (
      <>
        <h1 className="text-xl font-semibold tracking-tight">{t("resetInvalidTitle")}</h1>
        <p className="panel-muted mt-1.5 text-sm">{t("resetInvalidBody")}</p>
        <Link href={`/${locale}/forgot`} className="panel-btn mt-6 w-full px-5 py-2.5 text-sm">
          {t("sendLink")}
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">{t("resetTitle")}</h1>
      <p className="panel-muted mt-1.5 text-sm">{t("resetSubtitle")}</p>

      <form action={resetPasswordAction} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="token" value={token} />
        <div className="space-y-1.5">
          <label htmlFor="password" className="panel-label">{t("newPassword")}</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="panel-input" />
          <p className="panel-muted text-xs">{t("passwordHint")}</p>
        </div>
        {error === "password" ? <p className="text-sm text-[var(--p-danger-text)]">{t("errorPassword")}</p> : null}
        <button type="submit" className="panel-btn w-full px-5 py-2.5 text-sm">
          {t("savePassword")}
        </button>
      </form>
    </>
  );
}

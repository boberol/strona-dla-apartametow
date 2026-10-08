import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { forgotPassword } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("forgotTitle") };
}

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { locale } = await params;
  const { sent } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("auth");

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">{t("forgotTitle")}</h1>

      {sent ? (
        <p role="status" className="mt-4 rounded-lg bg-[var(--p-accent-soft)] px-3 py-2.5 text-sm">
          {t("forgotSent")}
        </p>
      ) : (
        <>
          <p className="panel-muted mt-1.5 text-sm">{t("forgotSubtitle")}</p>
          <form action={forgotPassword} className="mt-6 space-y-4">
            <input type="hidden" name="locale" value={locale} />
            <div className="space-y-1.5">
              <label htmlFor="email" className="panel-label">{t("email")}</label>
              <input id="email" name="email" type="email" required autoComplete="email" className="panel-input" />
            </div>
            <button type="submit" className="panel-btn w-full px-5 py-2.5 text-sm">
              {t("sendLink")}
            </button>
          </form>
        </>
      )}

      <p className="panel-muted mt-6 text-center text-sm">
        <Link href={`/${locale}/login`} className="panel-link font-medium">
          {t("backToLogin")}
        </Link>
      </p>
    </>
  );
}

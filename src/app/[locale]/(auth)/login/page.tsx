import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { signIn } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("logIn") };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const { locale } = await params;
  const { error, reset } = await searchParams;
  setRequestLocale(locale);

  if (await getSessionUser()) redirect(`/${locale}/dashboard`);

  const t = await getTranslations("auth");

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">{t("signInTitle")}</h1>
      <p className="panel-muted mt-1.5 text-sm">{t("signInSubtitle")}</p>

      {reset ? (
        <p role="status" className="mt-4 rounded-lg bg-[var(--p-accent-soft)] px-3 py-2.5 text-sm">
          {t("resetDone")}
        </p>
      ) : null}

      <form action={signIn} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />

        <div className="space-y-1.5">
          <label htmlFor="email" className="panel-label">{t("email")}</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="panel-input" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="password" className="panel-label">{t("password")}</label>
            <Link href={`/${locale}/forgot`} className="panel-muted text-xs hover:text-[var(--p-text)]">
              {t("forgotLink")}
            </Link>
          </div>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="panel-input" />
        </div>

        {error ? <p className="text-sm text-[var(--p-danger-text)]">{t("errorCredentials")}</p> : null}

        <button type="submit" className="panel-btn w-full px-5 py-2.5 text-sm">
          {t("logIn")}
        </button>
      </form>

      <p className="panel-muted mt-6 text-center text-sm">
        {t("noAccount")}{" "}
        <Link href={`/${locale}/signup`} className="panel-link font-medium">
          {t("createAccount")}
        </Link>
      </p>
    </>
  );
}

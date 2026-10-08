import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { isBillingInterval, isPlanId } from "@/lib/plans";
import { signUp } from "../actions";

const ERRORS: Record<string, string> = {
  email: "errorEmail",
  password: "errorPassword",
  taken: "errorTaken",
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("auth"))("signUpTitle") };
}

export default async function SignUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; plan?: string; interval?: string }>;
}) {
  const { locale } = await params;
  const { error, plan, interval } = await searchParams;
  setRequestLocale(locale);

  if (await getSessionUser()) redirect(`/${locale}/dashboard`);

  const t = await getTranslations("auth");
  const tb = await getTranslations("billing");
  const carriesPlan = isPlanId(plan) && isBillingInterval(interval);

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">{t("signUpTitle")}</h1>
      <p className="panel-muted mt-1.5 text-sm">{t("signUpSubtitle")}</p>

      {carriesPlan ? (
        <p className="mt-4 rounded-lg bg-[var(--p-accent-soft)] px-3 py-2 text-sm">
          {t("selectedPlan")}: <strong>{tb(`plan${plan === "one" ? "One" : plan === "complex" ? "Complex" : "Pro"}Name`)}</strong>
        </p>
      ) : null}

      <form action={signUp} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        {carriesPlan ? <input type="hidden" name="plan" value={plan} /> : null}
        {carriesPlan ? <input type="hidden" name="interval" value={interval} /> : null}

        <div className="space-y-1.5">
          <label htmlFor="name" className="panel-label">{t("name")}</label>
          <input id="name" name="name" className="panel-input" autoComplete="organization" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="panel-label">{t("email")}</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="panel-input" />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="panel-label">{t("password")}</label>
          <input id="password" name="password" type="password" required autoComplete="new-password" className="panel-input" />
          <p className="panel-muted text-xs">{t("passwordHint")}</p>
        </div>

        {error && ERRORS[error] ? (
          <p className="text-sm text-[var(--p-danger-text)]">{t(ERRORS[error])}</p>
        ) : null}

        <button type="submit" className="panel-btn w-full px-5 py-2.5 text-sm">
          {t("createAccount")}
        </button>
      </form>

      <p className="panel-muted mt-6 text-center text-sm">
        {t("haveAccount")}{" "}
        <Link href={`/${locale}/login`} className="panel-link font-medium">
          {t("logIn")}
        </Link>
      </p>
    </>
  );
}

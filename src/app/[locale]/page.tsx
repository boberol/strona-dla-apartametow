import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PricingTable } from "@/components/marketing/PricingTable";
import { TemplatePreview } from "@/components/panel/TemplatePreview";
import { Brand } from "@/components/panel/Brand";
import { ThemeToggle } from "@/components/panel/ThemeToggle";
import { Icon } from "@/components/guest/Icon";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildTemplate } from "@/site/templates";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/site/schema";

/* The public site: what StayGuide is, and where a subscription is bought. */

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-6xl scroll-mt-20 px-6 ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle ? <p className="panel-muted mt-3 text-[15px] leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}

export default async function MarketingHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("marketing");
  const nav = await getTranslations("nav");
  const contentLocale: Locale = (LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : "en";

  const user = await getSessionUser();
  const demo = await db.property.findFirst({
    where: { published: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  });

  const steps = [
    { title: t("stepOneTitle"), body: t("stepOneBody") },
    { title: t("stepTwoTitle"), body: t("stepTwoBody") },
    { title: t("stepThreeTitle"), body: t("stepThreeBody") },
  ];

  const features = [
    { title: t("featureGuideTitle"), body: t("featureGuideBody"), icon: "tabler:book" },
    { title: t("featureIssueTitle"), body: t("featureIssueBody"), icon: "tabler:alert-triangle" },
    { title: t("featureReviewTitle"), body: t("featureReviewBody"), icon: "tabler:star" },
    { title: t("featureBrandTitle"), body: t("featureBrandBody"), icon: "tabler:palette" },
    { title: t("featureLanguageTitle"), body: t("featureLanguageBody"), icon: "tabler:language" },
    { title: t("featureEditorTitle"), body: t("featureEditorBody"), icon: "tabler:edit" },
  ];

  const faqs = [
    { q: t("faqOneQ"), a: t("faqOneA") },
    { q: t("faqTwoQ"), a: t("faqTwoA") },
    { q: t("faqThreeQ"), a: t("faqThreeA") },
    { q: t("faqFourQ"), a: t("faqFourA") },
    { q: t("faqFiveQ"), a: t("faqFiveA") },
  ];

  const localeLinks = (
    <div className="flex items-center gap-0.5 text-xs">
      {LOCALES.map((code) => (
        <Link
          key={code}
          href={`/${code}`}
          hrefLang={code}
          title={LOCALE_LABELS[code]}
          aria-current={code === locale ? "true" : undefined}
          className={`rounded-md px-1.5 py-1 font-medium uppercase transition ${
            code === locale
              ? "text-[var(--p-text)]"
              : "panel-muted hover:text-[var(--p-text)]"
          }`}
        >
          {code}
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--p-border)] bg-[var(--p-bg)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-8">
            <Brand href={`/${locale}`} />
            <nav className="panel-muted hidden items-center gap-6 text-sm md:flex">
              <a href="#how" className="hover:text-[var(--p-text)]">{nav("howItWorks")}</a>
              <a href="#pricing" className="hover:text-[var(--p-text)]">{nav("pricing")}</a>
              <a href="#faq" className="hover:text-[var(--p-text)]">{nav("faq")}</a>
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="hidden sm:block">{localeLinks}</div>
            <ThemeToggle />
            {user ? (
              <Link href={`/${locale}/dashboard`} className="panel-btn ml-1.5 px-4 py-2 text-sm">
                {nav("dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href={`/${locale}/login`}
                  className="panel-muted px-2.5 py-2 text-sm hover:text-[var(--p-text)]"
                >
                  {nav("login")}
                </Link>
                <Link href={`/${locale}/signup`} className="panel-btn ml-1 hidden px-4 py-2 text-sm sm:inline-flex">
                  {nav("signup")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero ---------------------------------------------------- */}
        <Section className="grid items-center gap-12 pb-10 pt-10 sm:pb-20 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:pt-24">
          <div>
            <p className="text-sm font-semibold text-[var(--p-accent-text)]">{t("heroEyebrow")}</p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-[3.25rem]">
              {t("heroTitle")}
            </h1>
            <p className="panel-muted mt-5 max-w-lg text-lg leading-relaxed">{t("heroSubtitle")}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={`/${locale}/signup`} className="panel-btn px-6 py-3 text-sm">
                {t("heroCta")}
              </Link>
              {demo ? (
                <Link href={`/s/${demo.slug}`} className="panel-btn-ghost px-6 py-3 text-sm">
                  {t("openDemo")}
                </Link>
              ) : null}
            </div>

            <p className="panel-muted mt-4 text-sm">{t("heroNote")}</p>
          </div>

          <div className="hidden justify-center lg:flex">
            <div className="panel-phone h-[600px] w-[296px]">
              <div className="h-full w-full overflow-hidden">
                <TemplatePreview doc={buildTemplate("general", "Sunny Apartments")} locale={contentLocale} />
              </div>
            </div>
          </div>
        </Section>

        {/* How it works -------------------------------------------- */}
        <Section id="how" className="py-14 sm:py-20">
          <SectionTitle title={t("stepsTitle")} />
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <li key={step.title} className="border-t border-[var(--p-border-strong)] pt-5">
                <span className="text-sm font-semibold text-[var(--p-accent-text)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="panel-muted mt-2 text-[15px] leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* Features ------------------------------------------------ */}
        <Section id="features" className="py-14 sm:py-20">
          <SectionTitle title={t("featuresTitle")} />
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <span className="mt-0.5 shrink-0 text-[var(--p-accent-text)]">
                  <Icon name={feature.icon} size={22} />
                </span>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="panel-muted mt-1.5 text-[15px] leading-relaxed">{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Pricing ------------------------------------------------- */}
        <Section id="pricing" className="py-14 sm:py-20">
          <SectionTitle title={t("pricingTitle")} subtitle={t("pricingSubtitle")} />
          <div className="mt-10">
            <PricingTable locale={locale} signedIn={Boolean(user)} />
          </div>
        </Section>

        {/* FAQ ----------------------------------------------------- */}
        <Section id="faq" className="py-14 sm:py-20">
          <SectionTitle title={t("faqTitle")} />
          <div className="mx-auto mt-10 max-w-2xl divide-y divide-[var(--p-border)] border-y border-[var(--p-border)]">
            {faqs.map((faq) => (
              <details key={faq.q} className="panel-disclosure group py-1">
                <summary className="!py-4 !text-[15px] !font-medium">{faq.q}</summary>
                <p className="panel-muted pb-5 pr-8 text-[15px] leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* Final CTA ----------------------------------------------- */}
        <Section className="pb-20 pt-8 text-center sm:pb-28 sm:pt-12">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("finalCtaTitle")}</h2>
          <p className="panel-muted mx-auto mt-3 max-w-lg text-[15px] leading-relaxed">
            {t("finalCtaBody")}
          </p>
          <Link href={`/${locale}/signup`} className="panel-btn mt-7 px-7 py-3 text-sm">
            {t("heroCta")}
          </Link>
        </Section>
      </main>

      <footer className="border-t border-[var(--p-border)]">
        <div className="panel-muted mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm">
          <span>© StayGuide · {t("footerNote")}</span>
          {localeLinks}
        </div>
      </footer>
    </>
  );
}

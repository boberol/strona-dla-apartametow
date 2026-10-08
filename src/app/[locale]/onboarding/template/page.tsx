import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { TemplatePicker, type TemplateChoice } from "@/components/panel/TemplatePicker";
import { TemplatePreview } from "@/components/panel/TemplatePreview";
import { Brand } from "@/components/panel/Brand";
import { ThemeToggle } from "@/components/panel/ThemeToggle";
import { PanelIcon } from "@/components/panel/icons";
import { currentOrg } from "@/lib/guard";
import { isBillingInterval, isPlanId } from "@/lib/plans";
import { buildTemplate, TEMPLATE_IDS, TEMPLATE_META } from "@/site/templates";
import { LOCALES, type Locale } from "@/site/schema";
import { createFromTemplate } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("onboarding"))("title") };
}

export default async function OnboardingTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; plan?: string; interval?: string }>;
}) {
  const { locale } = await params;
  const { error, plan, interval } = await searchParams;
  setRequestLocale(locale);

  const session = await currentOrg();
  if (!session) redirect(`/${locale}/login`);

  const t = await getTranslations("onboarding");
  const nav = await getTranslations("editor");
  const contentLocale: Locale = (LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : "en";

  const defaultName = session.org.name;

  const templates: TemplateChoice[] = TEMPLATE_IDS.map((id) => ({
    id,
    name: t(TEMPLATE_META[id].nameKey),
    description: t(TEMPLATE_META[id].descriptionKey),
    preview: <TemplatePreview doc={buildTemplate(id, defaultName)} locale={contentLocale} />,
  }));

  return (
    <>
      <header className="border-b border-[var(--p-border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Brand href={`/${locale}/dashboard`} />
            <Link
              href={`/${locale}/dashboard`}
              className="panel-muted hidden items-center gap-1.5 text-sm hover:text-[var(--p-text)] sm:inline-flex"
            >
              <PanelIcon name="arrowLeft" size={15} />
              {nav("backToDashboard")}
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <TemplatePicker
        templates={templates}
        locale={locale}
        action={createFromTemplate}
        defaultName={defaultName}
        error={error}
        plan={isPlanId(plan) && isBillingInterval(interval) ? { plan, interval } : null}
      />
    </>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/PanelShell";
import { CopyButton, PrintButton } from "@/components/panel/CopyButton";
import { PanelIcon } from "@/components/panel/icons";
import { accessProperty } from "@/lib/guard";
import { db } from "@/lib/db";
import { qrSvg, qrTarget } from "@/lib/qr";
import { parseSiteDoc } from "@/site/repair";
import { pick } from "@/site/schema";

/*
 * The printable QR card for one apartment.
 *
 * The card is always black on white -- it represents paper, not the panel --
 * and carries the prompt in every language the owner publishes, because the
 * guest standing in front of it has not chosen a language yet.
 */

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("qr"))("title") };
}

export default async function QrPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const result = await accessProperty(id);
  if (!result.ok) {
    if (result.reason === "unauthenticated") redirect(`/${locale}/login`);
    notFound();
  }

  const property = await db.property.findUniqueOrThrow({
    where: { id },
    select: { name: true, shortCode: true, published: true, draft: true, publishedAt: true },
  });

  const t = await getTranslations("qr");
  const nav = await getTranslations("editor");
  const doc = parseSiteDoc(property.published ?? property.draft);
  const title = pick(doc.header.logoText, doc.defaultLocale) || property.name;
  const brand = /^#[0-9a-f]{3,8}$/i.test(doc.theme.brand) ? doc.theme.brand : "#0f172a";

  const svg = await qrSvg(property.shortCode);
  const target = qrTarget(property.shortCode);

  // The default language first, then the rest in the order the owner set.
  const languages = [doc.defaultLocale, ...doc.locales.filter((l) => l !== doc.defaultLocale)];
  const prompts = await Promise.all(
    languages.map(async (lang) => (await getTranslations({ locale: lang, namespace: "qr" }))("cardPrompt")),
  );


  return (
    <PanelShell locale={locale} active="properties">
      <div className="no-print">
        <Link
          href={`/${locale}/dashboard`}
          className="panel-muted inline-flex items-center gap-1.5 text-sm hover:text-[var(--p-text)]"
        >
          <PanelIcon name="arrowLeft" size={15} />
          {nav("backToDashboard")}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {t("title")} <span className="panel-muted font-normal">· {property.name}</span>
        </h1>
      </div>

      <div className="mt-8 grid items-start gap-10 md:grid-cols-[auto_minmax(0,1fr)]">
        {/* The card itself: what gets printed. */}
        <div className="print-card mx-auto w-[340px] overflow-hidden rounded-3xl bg-white text-center text-neutral-900 shadow-[0_20px_50px_-20px_rgb(15_23_42/0.35)] ring-1 ring-black/5">
          <div className="h-2" style={{ background: brand }} />
          <div className="px-8 pb-8 pt-7">
            <p className="text-xl font-semibold tracking-tight">{title}</p>

            <div
              className="mx-auto mt-5 w-[220px] [&>svg]:h-auto [&>svg]:w-full"
              role="img"
              aria-label={t("imageAlt")}
              dangerouslySetInnerHTML={{ __html: svg }}
            />

            <ul className="mt-5 space-y-1">
              {prompts.map((prompt, index) => (
                <li
                  key={languages[index]}
                  className={index === 0 ? "text-[15px] font-semibold" : "text-[13px] text-neutral-500"}
                >
                  {prompt}
                </li>
              ))}
            </ul>

            <p className="mt-5 font-mono text-[11px] text-neutral-400">{target.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>

        <div className="no-print max-w-md space-y-8">
          <p className="panel-muted text-[15px] leading-relaxed">{t("intro")}</p>

          {!property.publishedAt ? (
            <p className="rounded-xl bg-[var(--p-warn-soft)] px-4 py-3 text-sm text-[var(--p-warn-text)]">
              {t("notPublished")}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <PrintButton label={t("print")} />
            <a href={`/api/sites/${id}/qr?format=png`} download className="panel-btn-ghost px-4 py-2 text-sm">
              <PanelIcon name="download" size={16} />
              PNG
            </a>
            <a href={`/api/sites/${id}/qr?format=svg`} download className="panel-btn-ghost px-4 py-2 text-sm">
              <PanelIcon name="download" size={16} />
              SVG
            </a>
          </div>

          <div>
            <p className="panel-label">{t("permanentLink")}</p>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] py-1.5 pl-3 pr-1.5">
              <code className="min-w-0 flex-1 truncate text-sm">{target}</code>
              <CopyButton value={target} />
            </div>
            <p className="panel-muted mt-2 text-sm">{t("permanentHint")}</p>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

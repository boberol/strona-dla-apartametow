import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

import { BlockList } from "@/components/guest/BlockRenderer";
import { Icon } from "@/components/guest/Icon";
import { IssueForm } from "@/components/guest/IssueForm";
import { LanguageSwitcher } from "@/components/guest/LanguageSwitcher";
import { loadSite, previewAllowed, type LoadedSite } from "@/lib/site-store";
import { findTileByPath, visibleTiles } from "@/site/navigation";
import { safeHref } from "@/site/markdown";
import { FONT_QUERY, themeToCssVars } from "@/site/theme";
import { LOCALES, pick, type Locale, type Tile } from "@/site/schema";

type PageParams = { slug: string; lang: string; tile?: string[] };
type PageProps = {
  params: Promise<PageParams>;
  searchParams: Promise<{ preview?: string }>;
};

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

async function resolve(params: PageParams, preview: boolean) {
  const site = await loadSite(params.slug, preview);
  if (!site) return null;

  // Only languages the owner published are valid URLs.
  if (!(LOCALES as readonly string[]).includes(params.lang)) return null;
  const locale = params.lang as Locale;
  if (!site.doc.locales.includes(locale)) return null;

  const segments = params.tile ?? [];
  const match = segments.length
    ? findTileByPath(site.doc.tiles, segments)
    : { tile: null, trail: [] };
  if (!match) return null;

  return { site, locale, tile: match.tile as Tile | null, trail: match.trail };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const preview = await previewAllowed((await searchParams).preview === "1", (await params).slug);
  const resolved = await resolve(await params, preview);
  if (!resolved) {
    const lang = (await params).lang;
    const locale = (LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : "en";
    return { title: (await getTranslations({ locale, namespace: "guest" }))("notFound"), robots: { index: false } };
  }

  const { site, locale, tile } = resolved;
  const label = tile ? pick(tile.label, locale, site.doc.defaultLocale) : "";

  return {
    title: label ? `${label} - ${site.name}` : site.name,
    // A guest guide is reached by QR, never by search, and it holds the
    // apartment's Wi-Fi password and door codes.
    robots: { index: false, follow: false },
  };
}

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

function Header({
  site,
  locale,
  hrefFor,
  solid,
}: {
  site: LoadedSite;
  locale: Locale;
  hrefFor: (locale: Locale) => string;
  solid: boolean;
}) {
  const { header } = site.doc;
  const logoText = pick(header.logoText, locale, site.doc.defaultLocale) || site.name;

  return (
    <header
      className="relative z-10 flex items-center justify-between gap-3 px-5 py-4"
      style={solid ? { background: "var(--brand)" } : undefined}
    >
      <Link href={hrefFor(locale)} className="flex min-w-0 items-center gap-2">
        {header.logoUrl ? (
          <Image
            src={header.logoUrl}
            alt={logoText}
            width={120}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
        ) : (
          <span className="truncate text-lg font-semibold text-white">{logoText}</span>
        )}
      </Link>
      {header.showLanguageSwitcher ? (
        <LanguageSwitcher locales={site.doc.locales} current={locale} hrefFor={hrefFor} />
      ) : null}
    </header>
  );
}

const TILE_CLASS =
  "gg-tile flex min-h-36 flex-col items-center justify-center gap-3 p-4 text-center shadow-lg";

async function TileCard({
  tile,
  href,
  locale,
  fallback,
}: {
  tile: Tile;
  href: string;
  locale: Locale;
  fallback: Locale;
}) {
  const label = pick(tile.label, locale, fallback);
  const external = tile.kind === "link";
  const safe = external && tile.href ? safeHref(tile.href) : null;

  const inner = (
    <>
      <Icon name={tile.icon} size={30} />
      <span className="text-sm font-medium leading-tight">{label}</span>
    </>
  );

  if (external) {
    if (!safe) return null;
    return (
      <a href={safe} target="_blank" rel="noopener noreferrer" className={TILE_CLASS}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={TILE_CLASS}>
      {inner}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function GuestTilePage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const preview = await previewAllowed((await searchParams).preview === "1", (await params).slug);
  const resolved = await resolve(resolvedParams, preview);
  if (!resolved) notFound();

  const { site, locale, tile, trail } = resolved;
  const t = await getTranslations({ locale, namespace: "guest" });
  const { doc } = site;
  const fallback = doc.defaultLocale;
  const previewSuffix = preview ? "?preview=1" : "";

  const base = `/s/${site.slug}`;
  const pathFor = (lang: Locale, segments: string[]) =>
    [base, lang, ...segments].join("/") + previewSuffix;

  const currentSegments = trail.map((item) => item.slug);
  const hrefFor = (lang: Locale) => pathFor(lang, currentSegments);
  const parentHref = pathFor(locale, currentSegments.slice(0, -1));

  const styleVars = themeToCssVars(doc) as React.CSSProperties;
  const fontHref = `https://fonts.googleapis.com/css2?family=${FONT_QUERY[doc.theme.font]}&display=swap`;

  const showGrid = tile === null || tile.kind === "section";
  const children = tile === null ? visibleTiles(doc.tiles) : visibleTiles(tile.children);

  const backButton = (
    <Link
      href={parentHref}
      aria-label={t("back")}
      className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-lg"
      style={{ color: "var(--accent)" }}
    >
      <Icon name="ph:arrow-left" size={22} />
    </Link>
  );

  return (
    <div className="gg-root flex flex-col" style={styleVars}>
      <link rel="stylesheet" href={fontHref} />

      {/* Background only shows behind the tile grid; content pages sit on a solid card. */}
      {showGrid ? (
        doc.background.imageUrl ? (
          <>
            <Image src={doc.background.imageUrl} alt="" fill priority sizes="100vw" className="gg-bg" />
            <div className="gg-bg-overlay" />
          </>
        ) : (
          <div className="gg-bg-fallback" />
        )
      ) : null}

      {/* Only warn when the draft actually differs; otherwise the preview is
          identical to the live site and a warning would be misleading. */}
      {preview && site.hasUnpublishedChanges ? (
        <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
          {t("previewBanner")}
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <Header site={site} locale={locale} hrefFor={hrefFor} solid={!showGrid} />

        {showGrid ? (
          <main className="grid grid-cols-2 gap-3 px-4 pb-10 pt-2">
            {children.map((child) => (
              <TileCard
                key={child.id}
                tile={child}
                href={pathFor(locale, [...currentSegments, child.slug])}
                locale={locale}
                fallback={fallback}
              />
            ))}

            {tile !== null ? (
              <Link href={parentHref} className={TILE_CLASS}>
                <Icon name="ph:arrow-left" size={30} />
                <span className="text-sm font-medium">{t("back")}</span>
              </Link>
            ) : null}
          </main>
        ) : (
          <main className="flex flex-1 flex-col">
            {tile.heroImageUrl ? (
              <div className="relative shrink-0" style={{ aspectRatio: "4 / 3" }}>
                <Image
                  src={tile.heroImageUrl}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 448px) 100vw, 448px"
                  className="object-cover"
                />
              </div>
            ) : null}

            {/*
             * With a hero image the back button floats over the seam, matching
             * the reference. Without one the card sits directly under the
             * header, so the button has to stay in normal flow or it would
             * cover the logo.
             */}
            <div
              className={
                "gg-card relative flex-1 rounded-t-3xl px-5 pb-10 " +
                (tile.heroImageUrl ? "-mt-6 pt-7" : "pt-5")
              }
            >
              {tile.heroImageUrl ? (
                <div className="absolute -top-5 left-5">{backButton}</div>
              ) : (
                <div className="mb-3">{backButton}</div>
              )}

              <h1 className="mb-5 text-center text-2xl font-semibold">
                {pick(tile.label, locale, fallback)}
              </h1>

              {tile.kind === "issue-form" ? (
                <IssueForm propertyId={site.id} locale={locale} />
              ) : (
                <BlockList blocks={tile.blocks} ctx={{ locale, fallback }} />
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { ColorInput, Field, ImageInput, L10nInput, RangeInput, Select, Toggle } from "./fields";
import {
  FONTS,
  LOCALES,
  LOCALE_LABELS,
  TILE_STYLES,
  type FontKey,
  type Locale,
  type SiteDoc,
  type TileStyle,
} from "@/site/schema";

const FONT_LABELS: Record<FontKey, string> = {
  inter: "Inter",
  playfair: "Playfair Display",
  dmsans: "DM Sans",
  lora: "Lora",
};

function Group({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="panel-disclosure border-b border-[var(--p-border)] last:border-b-0" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="space-y-3 pb-4 pt-1">{children}</div>
    </details>
  );
}

export function ThemePanel({
  doc,
  locale,
  onChange,
}: {
  doc: SiteDoc;
  locale: Locale;
  onChange: (patch: Partial<SiteDoc>) => void;
}) {
  const t = useTranslations("editor");

  const setTheme = (patch: Partial<SiteDoc["theme"]>) =>
    onChange({ theme: { ...doc.theme, ...patch } });

  function toggleLocale(candidate: Locale, enabled: boolean) {
    const next = enabled
      ? LOCALES.filter((l) => l === candidate || doc.locales.includes(l))
      : doc.locales.filter((l) => l !== candidate);

    // A site with no languages would have no renderable page at all.
    if (next.length === 0) return;

    onChange({
      locales: next,
      defaultLocale: next.includes(doc.defaultLocale) ? doc.defaultLocale : next[0],
    });
  }

  return (
    <div>
      <Group title={t("colours")} defaultOpen>
        <div className="space-y-0.5">
          <ColorInput label={t("brandColor")} value={doc.theme.brand} onChange={(brand) => setTheme({ brand })} />
          <ColorInput label={t("accentColor")} value={doc.theme.accent} onChange={(accent) => setTheme({ accent })} />
          <ColorInput label={t("tileBg")} value={doc.theme.tileBg} onChange={(tileBg) => setTheme({ tileBg })} />
          <ColorInput label={t("tileText")} value={doc.theme.tileText} onChange={(tileText) => setTheme({ tileText })} />
          <ColorInput label={t("cardBg")} value={doc.theme.cardBg} onChange={(cardBg) => setTheme({ cardBg })} />
          <ColorInput label={t("cardText")} value={doc.theme.cardText} onChange={(cardText) => setTheme({ cardText })} />
          <ColorInput
            label={t("backgroundColor")}
            value={doc.background.color}
            onChange={(color) => onChange({ background: { ...doc.background, color } })}
          />
        </div>
      </Group>

      <Group title={t("tilesAndText")}>
        <Field label={t("tileStyle")}>
          <Select<TileStyle>
            value={doc.theme.tileStyle}
            options={TILE_STYLES.map((style) => ({ value: style, label: t(style) }))}
            onChange={(tileStyle) => setTheme({ tileStyle })}
          />
        </Field>
        <Field label={t("font")}>
          <Select<FontKey>
            value={doc.theme.font}
            options={FONTS.map((font) => ({ value: font, label: FONT_LABELS[font] }))}
            onChange={(font) => setTheme({ font })}
          />
        </Field>
        <RangeInput
          label={t("radius")}
          value={doc.theme.radius}
          min={0}
          max={40}
          suffix="px"
          onChange={(radius) => setTheme({ radius })}
        />
      </Group>

      <Group title={t("background")}>
        <ImageInput
          label={t("backgroundImage")}
          value={doc.background.imageUrl}
          onChange={(imageUrl) => onChange({ background: { ...doc.background, imageUrl } })}
        />
        <RangeInput
          label={t("overlay")}
          value={doc.theme.overlay}
          min={0}
          max={100}
          suffix="%"
          onChange={(overlay) => setTheme({ overlay })}
        />
      </Group>

      <Group title={t("header")}>
        <ImageInput
          label={t("logo")}
          value={doc.header.logoUrl}
          onChange={(logoUrl) => onChange({ header: { ...doc.header, logoUrl } })}
        />
        <L10nInput
          label={t("logoText")}
          value={doc.header.logoText}
          locale={locale}
          onChange={(logoText) => onChange({ header: { ...doc.header, logoText } })}
        />
        <Toggle
          label={t("showLanguageSwitcher")}
          checked={doc.header.showLanguageSwitcher}
          onChange={(showLanguageSwitcher) =>
            onChange({ header: { ...doc.header, showLanguageSwitcher } })
          }
        />
      </Group>

      <Group title={t("languages")}>
        <div>
          {LOCALES.map((candidate) => (
            <Toggle
              key={candidate}
              label={LOCALE_LABELS[candidate]}
              checked={doc.locales.includes(candidate)}
              onChange={(enabled) => toggleLocale(candidate, enabled)}
            />
          ))}
          {doc.locales.length === 1 ? (
            <p className="panel-muted mt-1 text-xs">{t("atLeastOneLocale")}</p>
          ) : null}
        </div>

        <Field label={t("defaultLanguage")}>
          <Select<Locale>
            value={doc.defaultLocale}
            options={doc.locales.map((l) => ({ value: l, label: LOCALE_LABELS[l] }))}
            onChange={(defaultLocale) => onChange({ defaultLocale })}
          />
        </Field>
      </Group>
    </div>
  );
}

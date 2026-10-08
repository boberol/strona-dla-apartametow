import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Locales                                                             */
/* ------------------------------------------------------------------ */

export const LOCALES = ["en", "es", "pl"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pl: "Polski",
};

export const localeSchema = z.enum(LOCALES);

/**
 * A translatable value. Every locale is optional so a half-translated site is
 * still valid; readers use `pick()` to fall back to the default locale.
 */
const l10n = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({
    en: inner.optional(),
    es: inner.optional(),
    pl: inner.optional(),
  });

export const l10nStringSchema = l10n(z.string());
export type L10nString = z.infer<typeof l10nStringSchema>;

/** Read a translatable value, falling back so the UI is never blank. */
export function pick(
  value: L10nString | undefined,
  locale: Locale,
  fallback: Locale = DEFAULT_LOCALE,
): string {
  if (!value) return "";
  return value[locale] || value[fallback] || value.en || value.pl || value.es || "";
}

/** True when this field has content in `locale` — drives the editor's "missing translation" flag. */
export function hasTranslation(value: L10nString | undefined, locale: Locale): boolean {
  return Boolean(value && value[locale] && value[locale]!.trim().length > 0);
}

export const emptyL10n = (): L10nString => ({});

export const l10nOf = (text: string): L10nString => ({ en: text, es: text, pl: text });

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

export const FONTS = ["inter", "playfair", "dmsans", "lora"] as const;
export type FontKey = (typeof FONTS)[number];

export const FONT_STACKS: Record<FontKey, string> = {
  inter: "'Inter', system-ui, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
  dmsans: "'DM Sans', system-ui, sans-serif",
  lora: "'Lora', Georgia, serif",
};

export const TILE_STYLES = ["solid", "glass", "outline"] as const;
export type TileStyle = (typeof TILE_STYLES)[number];

export const themeSchema = z.object({
  brand: z.string(),
  accent: z.string(),
  tileBg: z.string(),
  tileText: z.string(),
  cardBg: z.string(),
  cardText: z.string(),
  font: z.enum(FONTS),
  radius: z.number().min(0).max(40),
  tileStyle: z.enum(TILE_STYLES),
  overlay: z.number().min(0).max(100),
});
export type Theme = z.infer<typeof themeSchema>;

export const DEFAULT_THEME: Theme = {
  brand: "#b89b72",
  accent: "#8a6d4a",
  tileBg: "#f2e7d5",
  tileText: "#2b2b2b",
  cardBg: "#ffffff",
  cardText: "#2b2b2b",
  font: "inter",
  radius: 22,
  tileStyle: "solid",
  overlay: 45,
};

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

export const BLOCK_TYPES = [
  "heading",
  "richText",
  "image",
  "gallery",
  "keyValue",
  "button",
  "map",
  "video",
  "faq",
  "contact",
  "divider",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

const blockBase = { id: z.string() };

export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    ...blockBase,
    type: z.literal("heading"),
    text: l10nStringSchema,
    level: z.union([z.literal(2), z.literal(3)]),
    align: z.enum(["left", "center"]),
  }),
  z.object({
    ...blockBase,
    type: z.literal("richText"),
    text: l10nStringSchema,
  }),
  z.object({
    ...blockBase,
    type: z.literal("image"),
    url: z.string().nullable(),
    alt: l10nStringSchema,
    rounded: z.boolean(),
  }),
  z.object({
    ...blockBase,
    type: z.literal("gallery"),
    images: z.array(z.object({ url: z.string(), alt: l10nStringSchema })),
  }),
  z.object({
    ...blockBase,
    type: z.literal("keyValue"),
    items: z.array(
      z.object({
        label: l10nStringSchema,
        // Not translatable on purpose: a Wi-Fi password is the same in every language.
        value: z.string(),
        copyable: z.boolean(),
      }),
    ),
  }),
  z.object({
    ...blockBase,
    type: z.literal("button"),
    label: l10nStringSchema,
    href: z.string(),
    style: z.enum(["primary", "secondary"]),
    icon: z.string().nullable(),
  }),
  z.object({
    ...blockBase,
    type: z.literal("map"),
    address: l10nStringSchema,
    query: z.string(),
  }),
  z.object({
    ...blockBase,
    type: z.literal("video"),
    url: z.string(),
  }),
  z.object({
    ...blockBase,
    type: z.literal("faq"),
    items: z.array(z.object({ q: l10nStringSchema, a: l10nStringSchema })),
  }),
  z.object({
    ...blockBase,
    type: z.literal("contact"),
    phone: z.string().nullable(),
    whatsapp: z.string().nullable(),
    email: z.string().nullable(),
    note: l10nStringSchema,
  }),
  z.object({ ...blockBase, type: z.literal("divider") }),
]);
export type Block = z.infer<typeof blockSchema>;
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

/* ------------------------------------------------------------------ */
/* Tiles                                                               */
/* ------------------------------------------------------------------ */

export const TILE_KINDS = ["section", "content", "issue-form", "link"] as const;
export type TileKind = (typeof TILE_KINDS)[number];

export type Tile = {
  id: string;
  slug: string;
  icon: string;
  label: L10nString;
  kind: TileKind;
  hidden: boolean;
  heroImageUrl: string | null;
  children: Tile[];
  blocks: Block[];
  href: string | null;
};

export const tileSchema: z.ZodType<Tile> = z.lazy(() =>
  z.object({
    id: z.string(),
    slug: z.string(),
    icon: z.string(),
    label: l10nStringSchema,
    kind: z.enum(TILE_KINDS),
    hidden: z.boolean(),
    heroImageUrl: z.string().nullable(),
    children: z.array(tileSchema),
    blocks: z.array(blockSchema),
    href: z.string().nullable(),
  }),
);

/* ------------------------------------------------------------------ */
/* Site document                                                       */
/* ------------------------------------------------------------------ */

export const siteDocSchema = z.object({
  version: z.literal(1),
  locales: z.array(localeSchema).min(1),
  defaultLocale: localeSchema,
  theme: themeSchema,
  background: z.object({
    imageUrl: z.string().nullable(),
    color: z.string(),
  }),
  header: z.object({
    logoUrl: z.string().nullable(),
    logoText: l10nStringSchema,
    showLanguageSwitcher: z.boolean(),
  }),
  tiles: z.array(tileSchema),
});
export type SiteDoc = z.infer<typeof siteDocSchema>;

export function createEmptySiteDoc(): SiteDoc {
  return {
    version: 1,
    locales: ["en", "es", "pl"],
    defaultLocale: "en",
    theme: { ...DEFAULT_THEME },
    background: { imageUrl: null, color: "#3a332c" },
    header: { logoUrl: null, logoText: emptyL10n(), showLanguageSwitcher: true },
    tiles: [],
  };
}

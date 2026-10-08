import {
  type Block,
  type L10nString,
  type Locale,
  type SiteDoc,
  type Theme,
  type Tile,
  type TileKind,
  DEFAULT_THEME,
  FONTS,
  LOCALES,
  TILE_KINDS,
  TILE_STYLES,
  blockSchema,
  createEmptySiteDoc,
  siteDocSchema,
} from "./schema";
import { newId, slugify } from "./factories";

/*
 * A guest page must render even if the stored document is old, partial or
 * corrupt. parseSiteDoc therefore never throws: it validates fast, and on
 * failure falls back to a field-by-field repair that drops only what it
 * cannot rescue.
 */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const bool = (v: unknown, fallback = false): boolean => (typeof v === "boolean" ? v : fallback);
const nullableStr = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

const num = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
};

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

function repairL10n(v: unknown): L10nString {
  if (!isRecord(v)) return {};
  const out: L10nString = {};
  for (const loc of LOCALES) {
    if (typeof v[loc] === "string") out[loc] = v[loc] as string;
  }
  return out;
}

function repairTheme(v: unknown): Theme {
  const t = isRecord(v) ? v : {};
  return {
    brand: str(t.brand, DEFAULT_THEME.brand),
    accent: str(t.accent, DEFAULT_THEME.accent),
    tileBg: str(t.tileBg, DEFAULT_THEME.tileBg),
    tileText: str(t.tileText, DEFAULT_THEME.tileText),
    cardBg: str(t.cardBg, DEFAULT_THEME.cardBg),
    cardText: str(t.cardText, DEFAULT_THEME.cardText),
    font: oneOf(t.font, FONTS, DEFAULT_THEME.font),
    radius: num(t.radius, DEFAULT_THEME.radius, 0, 40),
    tileStyle: oneOf(t.tileStyle, TILE_STYLES, DEFAULT_THEME.tileStyle),
    overlay: num(t.overlay, DEFAULT_THEME.overlay, 0, 100),
  };
}

/** Blocks are all-or-nothing: an unrescuable block is dropped, never faked. */
function repairBlocks(v: unknown): Block[] {
  if (!Array.isArray(v)) return [];
  const out: Block[] = [];
  for (const raw of v) {
    if (!isRecord(raw)) continue;
    const parsed = blockSchema.safeParse({ ...raw, id: str(raw.id) || newId() });
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/**
 * `usedIds` is document-wide (ids must be globally unique for editor selection);
 * `siblingSlugs` is per-level, because only siblings share a URL segment.
 */
function repairTile(
  v: unknown,
  usedIds: Set<string>,
  siblingSlugs: Set<string>,
  depth: number,
): Tile | null {
  if (!isRecord(v) || depth > 6) return null;

  const label = repairL10n(v.label);

  let id = str(v.id) || newId();
  while (usedIds.has(id)) id = newId();
  usedIds.add(id);

  const wanted = slugify(str(v.slug) || label.en || label.pl || label.es || "");
  let slug = wanted;
  let n = 2;
  while (siblingSlugs.has(slug)) slug = `${wanted}-${n++}`;
  siblingSlugs.add(slug);

  const childSlugs = new Set<string>();

  return {
    id,
    slug,
    icon: str(v.icon, "tabler:point"),
    label,
    kind: oneOf<TileKind>(v.kind, TILE_KINDS, "content"),
    hidden: bool(v.hidden),
    heroImageUrl: nullableStr(v.heroImageUrl),
    children: Array.isArray(v.children)
      ? v.children
          .map((c) => repairTile(c, usedIds, childSlugs, depth + 1))
          .filter((t): t is Tile => t !== null)
      : [],
    blocks: repairBlocks(v.blocks),
    href: nullableStr(v.href),
  };
}

function repairSiteDoc(input: unknown): SiteDoc {
  const base = createEmptySiteDoc();
  if (!isRecord(input)) return base;

  const found = Array.isArray(input.locales)
    ? (input.locales.filter((l) => LOCALES.includes(l as Locale)) as Locale[])
    : [];
  const locales = found.length ? Array.from(new Set(found)) : base.locales;

  const bg = isRecord(input.background) ? input.background : {};
  const header = isRecord(input.header) ? input.header : {};
  const rootSlugs = new Set<string>();
  const usedIds = new Set<string>();

  return {
    version: 1,
    locales,
    defaultLocale: oneOf<Locale>(input.defaultLocale, locales, locales[0]),
    theme: repairTheme(input.theme),
    background: {
      imageUrl: nullableStr(bg.imageUrl),
      color: str(bg.color, base.background.color),
    },
    header: {
      logoUrl: nullableStr(header.logoUrl),
      logoText: repairL10n(header.logoText),
      showLanguageSwitcher: bool(header.showLanguageSwitcher, true),
    },
    tiles: Array.isArray(input.tiles)
      ? input.tiles
          .map((t) => repairTile(t, usedIds, rootSlugs, 0))
          .filter((t): t is Tile => t !== null)
      : [],
  };
}

/** Never throws. Accepts a JSON string, a parsed object, null, or garbage. */
export function parseSiteDoc(input: unknown): SiteDoc {
  let value = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return createEmptySiteDoc();
    }
  }
  const fast = siteDocSchema.safeParse(value);
  return fast.success ? fast.data : repairSiteDoc(value);
}

export const serializeSiteDoc = (doc: SiteDoc): string => JSON.stringify(doc);

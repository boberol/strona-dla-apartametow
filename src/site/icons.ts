import { getIconData, iconToSVG } from "@iconify/utils";
import type { IconifyJSON } from "@iconify/types";

/**
 * Icons are resolved to inline SVG on the server. The product this is modelled
 * on fetches its icons from an API at runtime (five extra requests per page);
 * a guest scanning a QR on mobile data should fetch none.
 */

const loaders: Record<string, () => Promise<IconifyJSON>> = {
  tabler: () => import("@iconify-json/tabler/icons.json").then((m) => m.default as IconifyJSON),
  ph: () => import("@iconify-json/ph/icons.json").then((m) => m.default as IconifyJSON),
  carbon: () => import("@iconify-json/carbon/icons.json").then((m) => m.default as IconifyJSON),
};

const cache = new Map<string, IconifyJSON>();

async function collection(prefix: string): Promise<IconifyJSON | null> {
  const cached = cache.get(prefix);
  if (cached) return cached;
  const load = loaders[prefix];
  if (!load) return null;
  const data = await load();
  cache.set(prefix, data);
  return data;
}

export const ICON_PREFIXES = Object.keys(loaders);

/** Neutral stand-in so an unknown name never leaves a blank tile. */
const FALLBACK_ICON = "tabler:point";

/** Returns `{ body, viewBox }` for an icon name like "tabler:wifi". */
export async function resolveIcon(
  name: string,
  allowFallback = true,
): Promise<{ body: string; viewBox: string } | null> {
  const retry = () =>
    allowFallback && name !== FALLBACK_ICON ? resolveIcon(FALLBACK_ICON, false) : null;

  const [prefix, iconName] = name.split(":");
  if (!prefix || !iconName) return retry();

  const data = await collection(prefix);
  if (!data) return retry();

  const iconData = getIconData(data, iconName);
  if (!iconData) return retry();

  const rendered = iconToSVG(iconData, { height: "none", width: "none" });
  return {
    body: rendered.body,
    viewBox: rendered.attributes.viewBox ?? "0 0 24 24",
  };
}

export type IconHit = { name: string; body: string; viewBox: string };

/** A small starter set so the picker is useful before anyone types. */
const SUGGESTED = [
  "tabler:wifi", "tabler:key", "tabler:door-enter", "tabler:parking", "tabler:map-pin",
  "tabler:bath", "tabler:tools-kitchen-2", "tabler:trash", "tabler:logout", "tabler:star",
  "tabler:phone", "tabler:alert-triangle", "tabler:info-circle", "tabler:book", "tabler:bed",
  "tabler:temperature", "tabler:dog", "tabler:smoking-no", "tabler:swimming", "tabler:bike",
  "tabler:bus", "tabler:coffee", "tabler:shopping-cart", "tabler:beach", "tabler:sun",
  "carbon:policy", "ph:arrow-left", "tabler:wash-machine", "tabler:device-tv", "tabler:first-aid-kit",
];

/** Substring search across the bundled sets, suggestions first when idle. */
export async function searchIcons(query: string, limit = 60): Promise<IconHit[]> {
  const trimmed = query.trim().toLowerCase();
  const names: string[] = [];

  if (!trimmed) {
    names.push(...SUGGESTED);
  } else {
    for (const prefix of ICON_PREFIXES) {
      const data = await collection(prefix);
      if (!data) continue;
      for (const key of Object.keys(data.icons)) {
        if (key.includes(trimmed)) names.push(`${prefix}:${key}`);
        if (names.length >= limit * 2) break;
      }
      if (names.length >= limit * 2) break;
    }
  }

  const hits: IconHit[] = [];
  for (const name of names.slice(0, limit)) {
    const icon = await resolveIcon(name, false);
    if (icon) hits.push({ name, ...icon });
  }
  return hits;
}

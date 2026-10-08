import { LOCALES, type Locale } from "./schema";

/**
 * Picks a language from an Accept-Language header, but only from `available`,
 * so a guest never lands on a language the owner never filled in.
 */
export function negotiateLocale(header: string | null, available: readonly Locale[], fallback: Locale): Locale {
  if (!header) return fallback;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if ((LOCALES as readonly string[]).includes(base) && available.includes(base as Locale)) {
      return base as Locale;
    }
  }
  return fallback;
}

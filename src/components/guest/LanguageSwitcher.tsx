import Link from "next/link";
import type { Locale } from "@/site/schema";

/**
 * Switching language keeps the guest on the same tile, because every tile has
 * a real URL. The site this is modelled on keeps everything at one address, so
 * a shared link always drops you back at the top.
 */
export function LanguageSwitcher({
  locales,
  current,
  hrefFor,
}: {
  locales: Locale[];
  current: Locale;
  hrefFor: (locale: Locale) => string;
}) {
  if (locales.length < 2) return null;

  return (
    <nav className="flex items-center gap-1" aria-label="Language">
      {locales.map((locale) => {
        const active = locale === current;
        return (
          <Link
            key={locale}
            href={hrefFor(locale)}
            hrefLang={locale}
            aria-current={active ? "true" : undefined}
            className={
              "grid h-8 min-w-8 place-items-center rounded-full px-2 text-xs font-semibold uppercase transition " +
              (active ? "bg-white/90 text-black" : "text-white/80 hover:text-white")
            }
          >
            {locale}
          </Link>
        );
      })}
    </nav>
  );
}

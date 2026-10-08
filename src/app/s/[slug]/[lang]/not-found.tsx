"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * 404 inside a guest site: an unknown tile, or a language the owner does not
 * publish. Neutral rather than themed -- the owner's theme is not loaded here --
 * and it offers a way back to the start of the guide when there is one.
 */
export default function GuestNotFound() {
  const t = useTranslations("guest");
  const path = usePathname() ?? "";
  const [, s, slug, lang, ...tile] = path.split("/");
  // Only link back when the site and language exist and a tile was missing.
  const home = s === "s" && slug && lang && tile.length > 0 ? `/s/${slug}/${lang}` : null;

  return (
    <main className="grid min-h-svh place-items-center bg-gradient-to-b from-neutral-100 to-neutral-200 px-6 text-neutral-900">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-neutral-100 text-2xl" aria-hidden="true">
          ?
        </div>
        <h1 className="mt-5 text-xl font-semibold">{t("notFound")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{t("notFoundBody")}</p>
        {home ? (
          <Link href={home} className="mt-6 inline-block rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white">
            {t("home")}
          </Link>
        ) : null}
      </div>
    </main>
  );
}

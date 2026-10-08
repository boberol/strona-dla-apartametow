import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/urls";
import { LOCALES } from "@/site/schema";

/** The public pages, in every language, linked to each other as alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LOCALES.map((locale) => [locale, appUrl(`/${locale}`)]));
  return LOCALES.flatMap((locale) => [
    { url: appUrl(`/${locale}`), changeFrequency: "monthly" as const, priority: 1, alternates: { languages } },
    { url: appUrl(`/${locale}/signup`), changeFrequency: "yearly" as const, priority: 0.5 },
  ]);
}

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { loadSite, previewAllowed } from "@/lib/site-store";
import { negotiateLocale } from "@/site/negotiate";

/**
 * Bare /s/{slug} is what a QR code resolves to. Pick the guest's language from
 * their browser, but only from the languages this owner actually published --
 * otherwise a guest lands on a page the owner never filled in.
 */
export default async function GuestRoot({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const preview = await previewAllowed((await searchParams).preview === "1", slug);
  const site = await loadSite(slug, preview);
  if (!site) notFound();

  const accept = (await headers()).get("accept-language");
  const locale = negotiateLocale(accept, site.doc.locales, site.doc.defaultLocale);

  redirect(`/s/${slug}/${locale}${preview ? "?preview=1" : ""}`);
}

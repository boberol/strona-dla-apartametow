import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Brand } from "@/components/panel/Brand";
import { ThemeToggle } from "@/components/panel/ThemeToggle";
import { PanelIcon } from "@/components/panel/icons";
import { getSessionUser } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "404", robots: { index: false } };

/**
 * 404 for the marketing site and the panel. Also what a non-admin sees at
 * /admin, and what anyone sees for an apartment id that is not theirs: the
 * same page as for something that does not exist.
 */
export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations("notFound");
  const signedIn = Boolean(await getSessionUser());

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Brand href={`/${locale}`} />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-[var(--p-accent-text)]">404</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="panel-muted mt-3 leading-relaxed">{t("body")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={signedIn ? `/${locale}/dashboard` : `/${locale}`} className="panel-btn px-5 py-2.5 text-sm">
              <PanelIcon name="arrowLeft" size={16} />
              {signedIn ? t("toDashboard") : t("toHome")}
            </Link>
            {signedIn ? (
              <Link href={`/${locale}/dashboard/guide`} className="panel-btn-ghost px-5 py-2.5 text-sm">
                {t("toGuide")}
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

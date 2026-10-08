import { cookies, headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { LOCALES } from "@/site/schema";
import { negotiateLocale } from "@/site/negotiate";
import { THEME_COOKIE, parseThemeChoice } from "@/lib/theme";
import "./globals.css";

/**
 * The 404 outside the /{locale} site: a mistyped guest address, a site that
 * was taken down, or a QR code that matches nothing. The person reading it is
 * usually a guest with a phone, so it speaks their language and says what to
 * do, and there is no product chrome to get lost in.
 *
 * The root layout is a pass-through, so this renders its own <html>.
 */
export default async function RootNotFound() {
  const locale = negotiateLocale((await headers()).get("accept-language"), LOCALES, "en");
  const t = await getTranslations({ locale, namespace: "guest" });
  const theme = parseThemeChoice((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html lang={locale} className="panel" data-theme={theme ?? undefined}>
      <body className="min-h-svh font-sans antialiased">
        <main className="grid min-h-svh place-items-center px-6">
          <div className="max-w-sm text-center">
            <p className="text-sm font-semibold text-[var(--p-accent-text)]">404</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("notFound")}</h1>
            <p className="panel-muted mt-3 leading-relaxed">{t("notFoundBody")}</p>
          </div>
        </main>
      </body>
    </html>
  );
}

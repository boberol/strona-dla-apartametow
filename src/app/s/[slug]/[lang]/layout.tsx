import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { LOCALES, type Locale } from "@/site/schema";
import "../../../globals.css";

export default async function GuestLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = (LOCALES as readonly string[]).includes(lang) ? (lang as Locale) : "en";
  const messages = (await import(`../../../../../messages/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

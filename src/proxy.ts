import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  /*
   * Locale-prefix only the marketing site and dashboard.
   *
   * The guest app (/s/...) is deliberately excluded: it carries its own locale
   * segment, restricted to the languages the owner actually published, so a
   * guest can never land on an empty page in a language the owner never filled in.
   * /q (printed QR codes), /api and static assets are excluded outright.
   */
  matcher: ["/((?!api|q|s|_next|_vercel|uploads|.*\..*).*)"],
};

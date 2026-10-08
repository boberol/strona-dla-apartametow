import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/urls";

/**
 * Only the marketing pages are meant for search engines. Guest sites carry
 * Wi-Fi passwords and door codes and are reached by QR code, never by search.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/s/", "/q/", "/*/dashboard", "/*/admin", "/*/onboarding", "/*/reset"],
    },
    sitemap: appUrl("/sitemap.xml"),
  };
}

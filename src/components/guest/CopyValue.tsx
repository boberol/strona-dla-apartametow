"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Tap-to-copy for things a guest would otherwise retype on a phone keyboard,
 * such as a Wi-Fi password. Falls back silently when the Clipboard API is
 * unavailable (older browsers, or a page not served over HTTPS).
 */
export function CopyValue({ value }: { value: string }) {
  const t = useTranslations("guest");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard unavailable: the value is still shown and selectable. */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-full border border-current/25 px-3 py-1 text-xs font-medium opacity-70 transition hover:opacity-100"
      style={{ color: "var(--accent)" }}
    >
      {copied ? t("copied") : t("copy")}
    </button>
  );
}

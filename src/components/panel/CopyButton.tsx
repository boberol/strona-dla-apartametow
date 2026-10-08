"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PanelIcon } from "./icons";

export function CopyButton({ value }: { value: string }) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the value is still selectable on screen */
    }
  }

  return (
    <button type="button" onClick={() => void copy()} className="panel-btn-ghost shrink-0 px-3 py-1.5 text-sm">
      <PanelIcon name={copied ? "check" : "copy"} size={15} />
      {copied ? t("copied") : t("copy")}
    </button>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="panel-btn px-4 py-2 text-sm">
      <PanelIcon name="printer" size={16} />
      {label}
    </button>
  );
}

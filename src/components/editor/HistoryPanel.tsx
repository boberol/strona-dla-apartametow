"use client";

import { useEffect, useState } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { PanelIcon } from "@/components/panel/icons";
import type { SiteDoc } from "@/site/schema";

type Version = { id: string; createdAt: string };

/**
 * Every publish is a snapshot. Restoring copies one into the draft -- guests
 * keep seeing the live version until the owner publishes again.
 */
export function HistoryPanel({
  propertyId,
  refreshKey,
  readOnly,
  onRestore,
}: {
  propertyId: string;
  /** Changes after each publish, so the new snapshot shows up. */
  refreshKey: number;
  readOnly: boolean;
  onRestore: (doc: SiteDoc) => void;
}) {
  const t = useTranslations("editor");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/sites/${propertyId}/versions`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: { versions: Version[] }) => setVersions(data.versions))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [propertyId, refreshKey]);

  async function restore(version: Version) {
    if (!window.confirm(t("confirmRestore"))) return;
    setBusy(version.id);
    setFailed(false);
    try {
      const response = await fetch(`/api/sites/${propertyId}/versions/${version.id}`);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { doc: SiteDoc };
      onRestore(data.doc);
      setRestored(version.id);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="panel-muted text-sm">{t("historyIntro")}</p>

      {failed ? <p className="text-sm text-[var(--p-danger-text)]">{t("historyFailed")}</p> : null}
      {versions === null && !failed ? <p className="panel-muted text-sm">{t("loading")}</p> : null}
      {versions?.length === 0 ? <p className="panel-muted text-sm">{t("historyEmpty")}</p> : null}

      <ul className="space-y-1">
        {versions?.map((version, index) => {
          const at = new Date(version.createdAt);
          return (
            <li
              key={version.id}
              className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 hover:bg-[var(--p-hover)]"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium" title={format.dateTime(at, { dateStyle: "long", timeStyle: "short" })}>
                  {format.dateTime(at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="panel-muted block text-xs">
                  {index === 0 ? t("liveVersion") : format.relativeTime(at, now)}
                </span>
              </span>
              {restored === version.id ? (
                <span className="panel-chip" data-tone="accent">
                  <PanelIcon name="check" size={11} />
                  {t("restored")}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={readOnly || busy !== null}
                  onClick={() => void restore(version)}
                  className="panel-btn-ghost shrink-0 px-2.5 py-1 text-xs"
                >
                  <PanelIcon name="undo" size={13} />
                  {busy === version.id ? t("loading") : t("restore")}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {restored ? <p className="rounded-lg bg-[var(--p-accent-soft)] px-3 py-2 text-sm">{t("restoredHint")}</p> : null}
    </div>
  );
}

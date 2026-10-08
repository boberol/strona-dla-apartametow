"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Inspector, type InspectorActions, type TilePosition } from "./Inspector";
import { HistoryPanel } from "./HistoryPanel";
import { ThemePanel } from "./ThemePanel";
import { TileTree, type TreeActions } from "./TileTree";
import { PanelIcon } from "@/components/panel/icons";
import { ThemeToggle } from "@/components/panel/ThemeToggle";
import * as ops from "@/site/mutations";
import { createTile } from "@/site/factories";
import { findTileById } from "@/site/navigation";
import { LOCALE_LABELS, type BlockType, type Locale, type SiteDoc, type Tile } from "@/site/schema";

type SaveState = "saved" | "saving" | "unsaved" | "error";

const AUTOSAVE_DELAY = 700;
const TIP_KEY = "sg_editor_tip_dismissed";

export function Editor({
  propertyId,
  propertyName,
  slug,
  uiLocale,
  initialDoc,
  initialHasUnpublishedChanges,
  readOnly = false,
}: {
  propertyId: string;
  propertyName: string;
  slug: string;
  uiLocale: string;
  initialDoc: SiteDoc;
  initialHasUnpublishedChanges: boolean;
  readOnly?: boolean;
}) {
  const t = useTranslations("editor");

  const [doc, setDoc] = useState<SiteDoc>(initialDoc);
  const [selectedId, setSelectedId] = useState<string | null>(initialDoc.tiles[0]?.id ?? null);
  const [panel, setPanel] = useState<"structure" | "design" | "history">("structure");
  const [publishCount, setPublishCount] = useState(0);
  const [showTip, setShowTip] = useState(false);

  // First visit only: point at the guide. Read after mount so the server
  // render and the first client render agree.
  useEffect(() => {
    try {
      setShowTip(window.localStorage.getItem(TIP_KEY) !== "1");
    } catch {
      /* storage blocked: skip the tip */
    }
  }, []);

  function dismissTip() {
    setShowTip(false);
    try {
      window.localStorage.setItem(TIP_KEY, "1");
    } catch {
      /* storage blocked: it just shows again next time */
    }
  }
  const [contentLocale, setContentLocale] = useState<Locale>(initialDoc.defaultLocale);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [hasUnpublished, setHasUnpublished] = useState(initialHasUnpublishedChanges);
  const [publishing, setPublishing] = useState(false);

  /* The preview is an iframe of the real guest app, so it refreshes after a
   * save rather than re-rendering locally. That keeps exactly one renderer:
   * what the owner sees here is literally what a guest gets. */
  const [previewNonce, setPreviewNonce] = useState(0);
  const isFirstRender = useRef(true);

  const save = useCallback(
    async (next: SiteDoc) => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/sites/${propertyId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ doc: next }),
        });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { hasUnpublishedChanges: boolean };
        setHasUnpublished(data.hasUnpublishedChanges);
        setSaveState("saved");
        setPreviewNonce((value) => value + 1);
      } catch {
        setSaveState("error");
      }
    },
    [propertyId],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Without a subscription the server would reject the write anyway; not
    // sending it keeps the owner from seeing a failure on every keystroke.
    if (readOnly) return;

    setSaveState("unsaved");
    const timer = window.setTimeout(() => void save(doc), AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [doc, save, readOnly]);

  // Losing edits to a closed tab is not recoverable, so warn while a save is pending.
  useEffect(() => {
    if (saveState === "saved") return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  async function publish() {
    setPublishing(true);
    try {
      const response = await fetch(`/api/sites/${propertyId}/publish`, { method: "POST" });
      if (response.ok) {
        setHasUnpublished(false);
        setPreviewNonce((value) => value + 1);
        setPublishCount((value) => value + 1);
      }
    } finally {
      setPublishing(false);
    }
  }

  const match = useMemo(
    () => (selectedId ? findTileById(doc.tiles, selectedId) : null),
    [doc, selectedId],
  );

  const position = useMemo<TilePosition | null>(() => {
    if (!match) return null;
    const parent = match.trail.length > 1 ? match.trail[match.trail.length - 2] : null;
    const siblings = parent ? parent.children : doc.tiles;
    return {
      index: siblings.findIndex((tile) => tile.id === match.tile.id),
      siblingCount: siblings.length,
      depth: match.trail.length - 1,
    };
  }, [doc, match]);

  const previewUrl = useMemo(() => {
    let trail = match?.trail ?? [];
    // A link tile has no page of its own; show the grid it sits on instead.
    if (match?.tile.kind === "link") trail = trail.slice(0, -1);
    // Guests cannot open a hidden tile, so preview the nearest visible parent.
    const firstHidden = trail.findIndex((tile) => tile.hidden);
    if (firstHidden !== -1) trail = trail.slice(0, firstHidden);

    const previewLocale = doc.locales.includes(contentLocale) ? contentLocale : doc.defaultLocale;
    const path = [`/s/${slug}`, previewLocale, ...trail.map((item) => item.slug)].join("/");
    return `${path}?preview=1&v=${previewNonce}`;
  }, [doc, match, contentLocale, slug, previewNonce]);

  const treeActions: TreeActions = {
    select: setSelectedId,
    move: (id, direction) => setDoc((d) => ops.moveTile(d, id, direction)),
    indent: (id) => setDoc((d) => ops.indentTile(d, id)),
    outdent: (id) => setDoc((d) => ops.outdentTile(d, id)),
    duplicate: (id) => setDoc((d) => ops.duplicateTile(d, id)),
    remove: (id) => {
      if (!window.confirm(t("confirmDeleteTile"))) return;
      setDoc((d) => ops.deleteTile(d, id));
      setSelectedId((current) => (current === id ? null : current));
    },
    addChild: (parentId) => {
      const tile: Tile = createTile("content", { [contentLocale]: t("newTile") });
      setDoc((d) => ops.insertTile(d, parentId, tile));
      setSelectedId(tile.id);
      setPanel("structure");
    },
  };

  const inspectorActions: InspectorActions = {
    updateTile: (id, patch) => setDoc((d) => ops.updateTile(d, id, patch)),
    addBlock: (tileId, type: BlockType) => setDoc((d) => ops.addBlock(d, tileId, type)),
    removeBlock: (tileId, blockId) => setDoc((d) => ops.removeBlock(d, tileId, blockId)),
    moveBlock: (tileId, blockId, direction) =>
      setDoc((d) => ops.moveBlock(d, tileId, blockId, direction)),
    updateBlock: (tileId, blockId, patch) =>
      setDoc((d) => ops.updateBlock(d, tileId, blockId, patch)),
  };

  const status = readOnly
    ? { label: t("readOnly"), tone: "text-[var(--p-warn-text)]", dot: "bg-[var(--p-warn-text)]" }
    : saveState === "error"
      ? { label: t("saveFailed"), tone: "text-[var(--p-danger-text)]", dot: "bg-[var(--p-danger-text)]" }
      : saveState === "saved"
        ? { label: t("saved"), tone: "panel-muted", dot: "bg-[var(--p-accent)]" }
        : {
            label: saveState === "saving" ? t("saving") : t("unsaved"),
            tone: "panel-muted",
            dot: "bg-[var(--p-subtle)] animate-pulse",
          };

  return (
    <div className="flex h-svh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--p-border)] bg-[var(--p-surface)] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/${uiLocale}/dashboard`}
            title={t("backToDashboard")}
            aria-label={t("backToDashboard")}
            className="panel-icon-btn"
          >
            <PanelIcon name="arrowLeft" size={18} />
          </Link>
          <span className="truncate text-sm font-semibold">{propertyName}</span>
          <span className={`hidden items-center gap-1.5 whitespace-nowrap text-xs sm:inline-flex ${status.tone}`} role="status">
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Which language you are editing. The preview follows it. */}
          {doc.locales.length > 1 ? (
            <div className="panel-segment mr-1.5" role="group" aria-label={t("editingLanguage")}>
              {doc.locales.map((locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => setContentLocale(locale)}
                  aria-pressed={locale === contentLocale}
                  title={LOCALE_LABELS[locale]}
                  className="!px-2.5 !py-1 !text-xs uppercase"
                >
                  {locale}
                </button>
              ))}
            </div>
          ) : null}

          <Link
            href={`/${uiLocale}/dashboard/guide`}
            target="_blank"
            title={t("openGuide")}
            aria-label={t("openGuide")}
            className="panel-icon-btn"
          >
            <PanelIcon name="help" size={17} />
          </Link>
          <a
            href={`/s/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            title={t("openLive")}
            aria-label={t("openLive")}
            className="panel-icon-btn"
          >
            <PanelIcon name="external" size={17} />
          </a>
          <ThemeToggle />

          {hasUnpublished ? (
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing || readOnly}
              className="panel-btn ml-1.5 px-4 py-1.5 text-sm"
            >
              {publishing ? t("publishing") : t("publish")}
            </button>
          ) : (
            <span className="panel-muted ml-1.5 inline-flex items-center gap-1 px-2 text-sm">
              <PanelIcon name="check" size={15} />
              {t("published")}
            </span>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[17rem_minmax(0,1fr)_23rem] lg:overflow-hidden">
        <aside className="border-[var(--p-border)] bg-[var(--p-surface)] p-3 lg:min-h-0 lg:overflow-y-auto lg:border-r">
          <div className="panel-segment mb-4 flex w-full" role="group">
            {(["structure", "design", "history"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPanel(key)}
                aria-pressed={panel === key}
                className="flex-1"
              >
                {t(key)}
              </button>
            ))}
          </div>

          {showTip ? (
            <div className="mb-4 rounded-xl bg-[var(--p-accent-soft)] p-3 text-sm">
              <p className="font-medium">{t("tipTitle")}</p>
              <p className="panel-muted mt-0.5">{t("tipBody")}</p>
              <div className="mt-2 flex items-center gap-3">
                <Link href={`/${uiLocale}/dashboard/guide`} target="_blank" className="panel-link font-medium">
                  {t("openGuide")}
                </Link>
                <button type="button" onClick={dismissTip} className="panel-muted hover:text-[var(--p-text)]">
                  {t("dismiss")}
                </button>
              </div>
            </div>
          ) : null}

          {panel === "structure" ? (
            <TileTree doc={doc} selectedId={selectedId} locale={contentLocale} actions={treeActions} />
          ) : panel === "design" ? (
            <ThemePanel
              doc={doc}
              locale={contentLocale}
              onChange={(patch) => setDoc((d) => ({ ...d, ...patch }))}
            />
          ) : (
            <HistoryPanel
              propertyId={propertyId}
              refreshKey={publishCount}
              readOnly={readOnly}
              onRestore={(restored) => {
                setDoc(restored);
                setSelectedId(restored.tiles[0]?.id ?? null);
              }}
            />
          )}
        </aside>

        <section className="hidden min-h-0 place-items-center p-6 lg:grid">
          <div
            className="panel-phone aspect-[372/740] h-[min(740px,calc(100svh-7rem))]"
            aria-label={t("preview")}
          >
            <iframe
              key={previewUrl}
              src={previewUrl}
              title={t("preview")}
              className="h-full w-full border-0"
            />
          </div>
        </section>

        <aside className="border-t border-[var(--p-border)] bg-[var(--p-surface)] p-5 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
          <Inspector
            tile={match?.tile ?? null}
            position={position}
            locale={contentLocale}
            actions={inspectorActions}
            tree={treeActions}
          />
        </aside>
      </div>
    </div>
  );
}

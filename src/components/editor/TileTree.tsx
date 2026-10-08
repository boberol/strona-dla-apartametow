"use client";

import { useTranslations } from "next-intl";
import { PanelIcon } from "@/components/panel/icons";
import { pick, type Locale, type SiteDoc, type Tile } from "@/site/schema";

/*
 * Structure panel: the tile tree.
 *
 * Rows only select. Reordering, nesting, duplicating and deleting live in the
 * inspector's toolbar for the selected tile, so the tree stays readable.
 * Buttons rather than drag-and-drop: they work with a keyboard and a screen
 * reader, and they make "nest" and "move out" explicit rather than something
 * you discover by dropping a row a few pixels to the right.
 */

export type TreeActions = {
  select: (id: string) => void;
  move: (id: string, direction: -1 | 1) => void;
  indent: (id: string) => void;
  outdent: (id: string) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  addChild: (parentId: string | null) => void;
};

function TileRow({
  tile,
  depth,
  selectedId,
  locale,
  onSelect,
}: {
  tile: Tile;
  depth: number;
  selectedId: string | null;
  locale: Locale;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("editor");
  const selected = tile.id === selectedId;
  const label = pick(tile.label, locale) || "—";

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(tile.id)}
        aria-current={selected ? "true" : undefined}
        style={{ paddingLeft: 10 + depth * 16 }}
        className={`flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-sm transition ${
          selected
            ? "bg-[var(--p-accent-soft)] font-medium text-[var(--p-accent-text)]"
            : "hover:bg-[var(--p-hover)]"
        }`}
      >
        {depth > 0 ? (
          <span aria-hidden="true" className="h-px w-2 shrink-0 bg-[var(--p-border-strong)]" />
        ) : null}
        <span className={`min-w-0 flex-1 truncate ${tile.hidden ? "opacity-50" : ""}`}>{label}</span>
        {tile.hidden ? (
          <span title={t("hidden")} className="shrink-0 opacity-60">
            <PanelIcon name="eyeOff" size={14} />
          </span>
        ) : null}
      </button>

      {tile.children.length > 0 ? (
        <ul>
          {tile.children.map((child) => (
            <TileRow
              key={child.id}
              tile={child}
              depth={depth + 1}
              selectedId={selectedId}
              locale={locale}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function TileTree({
  doc,
  selectedId,
  locale,
  actions,
}: {
  doc: SiteDoc;
  selectedId: string | null;
  locale: Locale;
  actions: TreeActions;
}) {
  const t = useTranslations("editor");

  return (
    <div className="space-y-3">
      <ul className="space-y-px">
        {doc.tiles.map((tile) => (
          <TileRow
            key={tile.id}
            tile={tile}
            depth={0}
            selectedId={selectedId}
            locale={locale}
            onSelect={actions.select}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => actions.addChild(null)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--p-border-strong)] py-2 text-sm text-[var(--p-muted)] transition hover:border-[var(--p-accent)] hover:text-[var(--p-text)]"
      >
        <PanelIcon name="plus" size={15} />
        {t("addTile")}
      </button>
    </div>
  );
}

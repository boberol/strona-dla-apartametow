"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BlockInspector } from "./BlockInspector";
import { Field, IconPicker, ImageInput, L10nInput, Select, TextInput, Toggle } from "./fields";
import type { TreeActions } from "./TileTree";
import { PanelIcon, type PanelIconName } from "@/components/panel/icons";
import { BLOCK_META } from "@/site/factories";
import {
  BLOCK_TYPES,
  TILE_KINDS,
  pick,
  type Block,
  type BlockType,
  type Locale,
  type Tile,
  type TileKind,
} from "@/site/schema";

export type InspectorActions = {
  updateTile: (id: string, patch: Partial<Tile>) => void;
  addBlock: (tileId: string, type: BlockType) => void;
  removeBlock: (tileId: string, blockId: string) => void;
  moveBlock: (tileId: string, blockId: string, direction: -1 | 1) => void;
  updateBlock: (tileId: string, blockId: string, patch: Record<string, unknown>) => void;
};

/** Where the selected tile sits, so the toolbar can disable impossible moves. */
export type TilePosition = { index: number; siblingCount: number; depth: number };

const KIND_LABEL_KEY: Record<TileKind, string> = {
  section: "section",
  content: "content",
  "issue-form": "issueForm",
  link: "link",
};

/** One line of text that tells collapsed blocks apart. */
function blockSummary(block: Block, locale: Locale): string {
  const firstLine = (text: string) => text.split("\n").find((line) => line.trim())?.trim() ?? "";
  switch (block.type) {
    case "heading":
    case "richText":
      return firstLine(pick(block.text, locale));
    case "button":
      return pick(block.label, locale);
    case "image":
      return pick(block.alt, locale);
    case "keyValue":
      return block.items.map((item) => pick(item.label, locale)).filter(Boolean).join(", ");
    case "faq":
      return block.items.map((item) => pick(item.q, locale)).filter(Boolean).join(", ");
    case "map":
      return firstLine(pick(block.address, locale));
    case "contact":
      return block.phone ?? block.email ?? "";
    default:
      return "";
  }
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: PanelIconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`panel-icon-btn ${danger ? "hover:bg-[var(--p-danger-soft)] hover:text-[var(--p-danger-text)]" : ""}`}
    >
      <PanelIcon name={icon} size={16} />
    </button>
  );
}

export function Inspector({
  tile,
  position,
  locale,
  actions,
  tree,
}: {
  tile: Tile | null;
  position: TilePosition | null;
  locale: Locale;
  actions: InspectorActions;
  tree: TreeActions;
}) {
  const t = useTranslations("editor");
  const tKinds = useTranslations("tileKinds");
  const tBlocks = useTranslations("blocks");
  const [adding, setAdding] = useState(false);
  const [openBlocks, setOpenBlocks] = useState<Set<string>>(new Set());

  // A block that was just added opens straight away, ready to fill in.
  const blockIds = tile?.blocks.map((block) => block.id) ?? [];
  const previousIds = useRef<{ tileId: string | null; ids: string[] }>({ tileId: null, ids: [] });
  useEffect(() => {
    const previous = previousIds.current;
    if (tile && previous.tileId === tile.id) {
      const fresh = blockIds.filter((id) => !previous.ids.includes(id));
      if (fresh.length > 0) setOpenBlocks((open) => new Set([...open, ...fresh]));
    }
    previousIds.current = { tileId: tile?.id ?? null, ids: blockIds };
    // blockIds is derived from tile; joining keeps the dependency stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tile?.id, blockIds.join(",")]);

  if (!tile || !position) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <p className="panel-muted max-w-[14rem] text-sm">{t("noSelection")}</p>
      </div>
    );
  }

  const toggleBlock = (id: string) =>
    setOpenBlocks((open) => {
      const next = new Set(open);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      {/* Which tile, and the structural moves for it. */}
      <header className="space-y-3 border-b border-[var(--p-border)] pb-4">
        <div>
          <h2 className="truncate text-base font-semibold">{pick(tile.label, locale) || "—"}</h2>
          <p className="panel-muted text-xs">{tKinds(KIND_LABEL_KEY[tile.kind])}</p>
        </div>
        <div className="-ml-1.5 flex items-center gap-0.5">
          <ToolButton icon="arrowUp" label={t("moveUp")} disabled={position.index === 0} onClick={() => tree.move(tile.id, -1)} />
          <ToolButton
            icon="arrowDown"
            label={t("moveDown")}
            disabled={position.index === position.siblingCount - 1}
            onClick={() => tree.move(tile.id, 1)}
          />
          <ToolButton icon="indent" label={t("indent")} disabled={position.index === 0} onClick={() => tree.indent(tile.id)} />
          <ToolButton icon="outdent" label={t("outdent")} disabled={position.depth === 0} onClick={() => tree.outdent(tile.id)} />
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-[var(--p-border)]" />
          <ToolButton icon="copy" label={t("duplicate")} onClick={() => tree.duplicate(tile.id)} />
          <ToolButton icon="trash" label={t("delete")} danger onClick={() => tree.remove(tile.id)} />
        </div>
      </header>

      {/* What guests see on the tile. */}
      <section className="space-y-4">
        <L10nInput
          label={t("label")}
          value={tile.label}
          locale={locale}
          onChange={(label) => actions.updateTile(tile.id, { label })}
        />

        {tile.kind === "link" ? (
          <Field label={t("linkUrl")}>
            <TextInput
              value={tile.href ?? ""}
              placeholder="https://"
              onChange={(href) => actions.updateTile(tile.id, { href: href || null })}
            />
          </Field>
        ) : null}

        <IconPicker value={tile.icon} onChange={(icon) => actions.updateTile(tile.id, { icon })} />

        {tile.kind !== "link" ? (
          <ImageInput
            label={t("heroImage")}
            value={tile.heroImageUrl}
            onChange={(heroImageUrl) => actions.updateTile(tile.id, { heroImageUrl })}
          />
        ) : null}

        {tile.kind === "section" ? (
          <button
            type="button"
            onClick={() => tree.addChild(tile.id)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--p-border-strong)] py-2 text-sm text-[var(--p-muted)] transition hover:border-[var(--p-accent)] hover:text-[var(--p-text)]"
          >
            <PanelIcon name="plus" size={15} />
            {t("addChildTile")}
          </button>
        ) : null}
      </section>

      {/* Rarely changed after setup. */}
      <details className="panel-disclosure border-t border-[var(--p-border)]">
        <summary>{t("settings")}</summary>
        <div className="space-y-4 pb-2 pt-1">
          <Field label={t("kind")}>
            <Select<TileKind>
              value={tile.kind}
              options={TILE_KINDS.map((kind) => ({ value: kind, label: tKinds(KIND_LABEL_KEY[kind]) }))}
              onChange={(kind) => actions.updateTile(tile.id, { kind })}
            />
          </Field>
          <Field label={t("slug")} hint={t("slugHint")}>
            <TextInput value={tile.slug} onChange={(slug) => actions.updateTile(tile.id, { slug })} />
          </Field>
          <Toggle
            label={t("hidden")}
            checked={tile.hidden}
            onChange={(hidden) => actions.updateTile(tile.id, { hidden })}
          />
        </div>
      </details>

      {tile.kind === "content" ? (
        <section className="space-y-3 border-t border-[var(--p-border)] pt-5">
          <h3 className="text-sm font-semibold">{t("blocks")}</h3>

          {tile.blocks.length === 0 ? <p className="panel-muted text-sm">{t("noBlocks")}</p> : null}

          <ul className="space-y-2">
            {tile.blocks.map((block, index) => {
              const open = openBlocks.has(block.id);
              const summary = blockSummary(block, locale);
              return (
                <li key={block.id} className="rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)]">
                  <div className="flex items-center gap-1 py-1 pl-1 pr-1">
                    <button
                      type="button"
                      onClick={() => toggleBlock(block.id)}
                      aria-expanded={open}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--p-hover)]"
                    >
                      <PanelIcon
                        name="arrowDown"
                        size={13}
                        className={`shrink-0 text-[var(--p-muted)] transition ${open ? "" : "-rotate-90"}`}
                      />
                      <span className="shrink-0 text-sm font-medium">{tBlocks(block.type)}</span>
                      {summary ? (
                        <span className="panel-muted min-w-0 truncate text-xs">{summary}</span>
                      ) : null}
                    </button>
                    <ToolButton
                      icon="arrowUp"
                      label={t("moveUp")}
                      disabled={index === 0}
                      onClick={() => actions.moveBlock(tile.id, block.id, -1)}
                    />
                    <ToolButton
                      icon="arrowDown"
                      label={t("moveDown")}
                      disabled={index === tile.blocks.length - 1}
                      onClick={() => actions.moveBlock(tile.id, block.id, 1)}
                    />
                    <ToolButton
                      icon="trash"
                      label={t("removeBlock")}
                      danger
                      onClick={() => actions.removeBlock(tile.id, block.id)}
                    />
                  </div>

                  {open ? (
                    <div className="border-t border-[var(--p-border)] p-3">
                      <BlockInspector
                        block={block}
                        locale={locale}
                        onChange={(patch) => actions.updateBlock(tile.id, block.id, patch)}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {adding ? (
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--p-border)] p-1.5">
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    actions.addBlock(tile.id, type);
                    setAdding(false);
                  }}
                  className="rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--p-hover)]"
                >
                  {tBlocks(BLOCK_META[type].labelKey.replace("blocks.", ""))}
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setAdding((value) => !value)}
            aria-expanded={adding}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--p-border-strong)] py-2 text-sm text-[var(--p-muted)] transition hover:border-[var(--p-accent)] hover:text-[var(--p-text)]"
          >
            <PanelIcon name={adding ? "arrowUp" : "plus"} size={15} />
            {adding ? t("cancel") : t("addBlock")}
          </button>
        </section>
      ) : null}
    </div>
  );
}

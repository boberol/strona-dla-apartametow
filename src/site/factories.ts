import { nanoid } from "nanoid";
import {
  type Block,
  type BlockType,
  type L10nString,
  type Tile,
  type TileKind,
  emptyL10n,
} from "./schema";

export const newId = () => nanoid(10);

/** URL-safe slug; falls back to a random id so a tile always has a usable path. */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/gi, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `t-${newId().slice(0, 6)}`;
}

export function createBlock(type: BlockType): Block {
  const id = newId();
  switch (type) {
    case "heading":
      return { id, type, text: emptyL10n(), level: 2, align: "left" };
    case "richText":
      return { id, type, text: emptyL10n() };
    case "image":
      return { id, type, url: null, alt: emptyL10n(), rounded: true };
    case "gallery":
      return { id, type, images: [] };
    case "keyValue":
      return { id, type, items: [{ label: emptyL10n(), value: "", copyable: true }] };
    case "button":
      return { id, type, label: emptyL10n(), href: "", style: "primary", icon: null };
    case "map":
      return { id, type, address: emptyL10n(), query: "" };
    case "video":
      return { id, type, url: "" };
    case "faq":
      return { id, type, items: [{ q: emptyL10n(), a: emptyL10n() }] };
    case "contact":
      return { id, type, phone: null, whatsapp: null, email: null, note: emptyL10n() };
    case "divider":
      return { id, type };
  }
}

export function createTile(kind: TileKind = "content", label: L10nString = emptyL10n()): Tile {
  return {
    id: newId(),
    slug: slugify(label.en || label.pl || label.es || ""),
    icon: "tabler:point",
    label,
    kind,
    hidden: false,
    heroImageUrl: null,
    children: [],
    blocks: [],
    href: null,
  };
}

/** Editor "add block" menu metadata. labelKey resolves against messages/*.json. */
export const BLOCK_META: Record<BlockType, { icon: string; labelKey: string }> = {
  heading: { icon: "tabler:heading", labelKey: "blocks.heading" },
  richText: { icon: "tabler:align-left", labelKey: "blocks.richText" },
  image: { icon: "tabler:photo", labelKey: "blocks.image" },
  gallery: { icon: "tabler:photo-plus", labelKey: "blocks.gallery" },
  keyValue: { icon: "tabler:key", labelKey: "blocks.keyValue" },
  button: { icon: "tabler:hand-click", labelKey: "blocks.button" },
  map: { icon: "tabler:map-pin", labelKey: "blocks.map" },
  video: { icon: "tabler:video", labelKey: "blocks.video" },
  faq: { icon: "tabler:help-circle", labelKey: "blocks.faq" },
  contact: { icon: "tabler:phone", labelKey: "blocks.contact" },
  divider: { icon: "tabler:separator-horizontal", labelKey: "blocks.divider" },
};

export const TILE_KIND_META: Record<TileKind, { icon: string; labelKey: string }> = {
  section: { icon: "tabler:folder", labelKey: "tileKinds.section" },
  content: { icon: "tabler:file-text", labelKey: "tileKinds.content" },
  "issue-form": { icon: "tabler:alert-triangle", labelKey: "tileKinds.issueForm" },
  link: { icon: "tabler:external-link", labelKey: "tileKinds.link" },
};

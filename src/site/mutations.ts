import type { Block, BlockType, SiteDoc, Tile } from "./schema";
import { createBlock, newId, slugify } from "./factories";

/*
 * Pure, immutable operations on a SiteDoc.
 *
 * The editor keeps the whole document in React state and applies these, so all
 * the tree logic is testable without rendering anything.
 */

type TileList = Tile[];

/** Sibling slugs form one URL segment each, so they must stay unique. */
function dedupeSiblingSlugs(tiles: TileList): TileList {
  const seen = new Set<string>();
  return tiles.map((tile) => {
    const wanted = slugify(tile.slug || tile.label.en || tile.label.pl || tile.label.es || "");
    let slug = wanted;
    let n = 2;
    while (seen.has(slug)) slug = `${wanted}-${n++}`;
    seen.add(slug);
    return slug === tile.slug ? tile : { ...tile, slug };
  });
}

/**
 * Applies `fn` to the first level where it reports a change, then stops.
 *
 * Stopping matters: an operation like "indent" moves a tile into a sibling's
 * children, and a blind recursive walk would then find it again at its new
 * depth and move it a second time.
 */
function applyOnce(tiles: TileList, fn: (level: TileList) => TileList | null): TileList {
  const applied = fn(tiles);
  if (applied) return applied;

  let changed = false;
  const next = tiles.map((tile) => {
    const children = applyOnce(tile.children, fn);
    if (children === tile.children) return tile;
    changed = true;
    return { ...tile, children };
  });

  return changed ? next : tiles;
}

const withTiles = (doc: SiteDoc, tiles: TileList): SiteDoc => ({ ...doc, tiles });

/* ------------------------------------------------------------------ */
/* Tiles                                                               */
/* ------------------------------------------------------------------ */

export function updateTile(doc: SiteDoc, id: string, patch: Partial<Tile>): SiteDoc {
  return withTiles(
    doc,
    applyOnce(doc.tiles, (level) => {
      const index = level.findIndex((tile) => tile.id === id);
      if (index === -1) return null;
      const next = [...level];
      next[index] = { ...next[index], ...patch };
      return patch.slug !== undefined || patch.label !== undefined
        ? dedupeSiblingSlugs(next)
        : next;
    }),
  );
}

export function deleteTile(doc: SiteDoc, id: string): SiteDoc {
  return withTiles(
    doc,
    applyOnce(doc.tiles, (level) =>
      level.some((tile) => tile.id === id) ? level.filter((tile) => tile.id !== id) : null,
    ),
  );
}

function cloneTile(tile: Tile): Tile {
  return {
    ...tile,
    id: newId(),
    children: tile.children.map(cloneTile),
    blocks: tile.blocks.map((block) => ({ ...block, id: newId() })),
  };
}

export function duplicateTile(doc: SiteDoc, id: string): SiteDoc {
  return withTiles(
    doc,
    applyOnce(doc.tiles, (level) => {
      const index = level.findIndex((tile) => tile.id === id);
      if (index === -1) return null;
      const next = [...level];
      next.splice(index + 1, 0, cloneTile(level[index]));
      return dedupeSiblingSlugs(next);
    }),
  );
}

export function insertTile(doc: SiteDoc, parentId: string | null, tile: Tile): SiteDoc {
  if (parentId === null) {
    return withTiles(doc, dedupeSiblingSlugs([...doc.tiles, tile]));
  }

  return withTiles(
    doc,
    applyOnce(doc.tiles, (level) => {
      const index = level.findIndex((item) => item.id === parentId);
      if (index === -1) return null;
      const parent = level[index];
      const next = [...level];
      next[index] = {
        ...parent,
        // A tile that gains children has to behave like a group.
        kind: "section",
        children: dedupeSiblingSlugs([...parent.children, tile]),
      };
      return next;
    }),
  );
}

export function moveTile(doc: SiteDoc, id: string, direction: -1 | 1): SiteDoc {
  return withTiles(
    doc,
    applyOnce(doc.tiles, (level) => {
      const index = level.findIndex((tile) => tile.id === id);
      if (index === -1) return null;
      const target = index + direction;
      if (target < 0 || target >= level.length) return level; // at an edge: no-op, but handled
      const next = [...level];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    }),
  );
}

/** Makes a tile a child of its previous sibling. */
export function indentTile(doc: SiteDoc, id: string): SiteDoc {
  return withTiles(
    doc,
    applyOnce(doc.tiles, (level) => {
      const index = level.findIndex((tile) => tile.id === id);
      if (index === -1) return null;
      if (index === 0) return level; // nothing to nest under

      const newParent = level[index - 1];
      // These kinds have no tile grid to nest into.
      if (newParent.kind === "issue-form" || newParent.kind === "link") return level;

      const moving = level[index];
      const next = [...level];
      next.splice(index, 1);
      next[index - 1] = {
        ...newParent,
        kind: "section",
        children: dedupeSiblingSlugs([...newParent.children, moving]),
      };
      return next;
    }),
  );
}

/** Moves a tile out to sit just after its former parent. */
export function outdentTile(doc: SiteDoc, id: string): SiteDoc {
  return withTiles(
    doc,
    applyOnce(doc.tiles, (level) => {
      const parentIndex = level.findIndex((tile) => tile.children.some((c) => c.id === id));
      if (parentIndex === -1) return null;

      const parent = level[parentIndex];
      const moving = parent.children.find((c) => c.id === id)!;

      const next = [...level];
      next[parentIndex] = { ...parent, children: parent.children.filter((c) => c.id !== id) };
      next.splice(parentIndex + 1, 0, moving);
      return dedupeSiblingSlugs(next);
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

function mapBlocks(doc: SiteDoc, tileId: string, fn: (blocks: Block[]) => Block[]): SiteDoc {
  return withTiles(
    doc,
    applyOnce(doc.tiles, (level) => {
      const index = level.findIndex((tile) => tile.id === tileId);
      if (index === -1) return null;
      const next = [...level];
      next[index] = { ...next[index], blocks: fn(next[index].blocks) };
      return next;
    }),
  );
}

export function addBlock(doc: SiteDoc, tileId: string, type: BlockType): SiteDoc {
  return mapBlocks(doc, tileId, (blocks) => [...blocks, createBlock(type)]);
}

export function removeBlock(doc: SiteDoc, tileId: string, blockId: string): SiteDoc {
  return mapBlocks(doc, tileId, (blocks) => blocks.filter((block) => block.id !== blockId));
}

export function updateBlock(
  doc: SiteDoc,
  tileId: string,
  blockId: string,
  patch: Record<string, unknown>,
): SiteDoc {
  return mapBlocks(doc, tileId, (blocks) =>
    blocks.map((block) => (block.id === blockId ? ({ ...block, ...patch } as Block) : block)),
  );
}

export function moveBlock(
  doc: SiteDoc,
  tileId: string,
  blockId: string,
  direction: -1 | 1,
): SiteDoc {
  return mapBlocks(doc, tileId, (blocks) => {
    const index = blocks.findIndex((block) => block.id === blockId);
    if (index === -1) return blocks;
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return blocks;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
}

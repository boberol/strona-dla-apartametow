import type { Tile } from "./schema";

export type TileMatch = { tile: Tile; trail: Tile[] };

/** Tiles a guest may see. The editor shows hidden ones; the guest app never does. */
export const visibleTiles = (tiles: Tile[]): Tile[] => tiles.filter((t) => !t.hidden);

/**
 * Resolve a URL path like ["arrival","wifi"] to a tile plus its ancestor trail.
 * Returns null on a bad path so the route can render a 404 instead of guessing.
 */
export function findTileByPath(tiles: Tile[], segments: string[]): TileMatch | null {
  const trail: Tile[] = [];
  let level = tiles;
  let current: Tile | null = null;

  for (const segment of segments) {
    const next: Tile | undefined = level.find((t) => t.slug === segment && !t.hidden);
    if (!next) return null;
    trail.push(next);
    current = next;
    level = next.children;
  }

  return current ? { tile: current, trail } : null;
}

/** Depth-first walk used by the editor for lookups and by the seed for checks. */
export function* walkTiles(tiles: Tile[], trail: Tile[] = []): Generator<TileMatch> {
  for (const tile of tiles) {
    const nextTrail = [...trail, tile];
    yield { tile, trail: nextTrail };
    yield* walkTiles(tile.children, nextTrail);
  }
}

export function findTileById(tiles: Tile[], id: string): TileMatch | null {
  for (const match of walkTiles(tiles)) {
    if (match.tile.id === id) return match;
  }
  return null;
}

/** Guest URL for a tile, e.g. /s/demo/arrival/wifi */
export const tilePath = (base: string, trail: Tile[]): string =>
  [base, ...trail.map((t) => t.slug)].join("/");

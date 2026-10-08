import { describe, expect, it } from "vitest";
import {
  addBlock,
  deleteTile,
  duplicateTile,
  indentTile,
  insertTile,
  moveBlock,
  moveTile,
  outdentTile,
  removeBlock,
  updateBlock,
  updateTile,
} from "./mutations";
import { createTile } from "./factories";
import { createEmptySiteDoc, type SiteDoc, type Tile } from "./schema";
import { findTileById, walkTiles } from "./navigation";

function docWith(...labels: string[]): SiteDoc {
  const doc = createEmptySiteDoc();
  doc.tiles = labels.map((label) => createTile("content", { en: label }));
  return doc;
}

const labels = (tiles: Tile[]) => tiles.map((t) => t.label.en);
const allIds = (doc: SiteDoc) => [...walkTiles(doc.tiles)].map((m) => m.tile.id);

describe("tile mutations", () => {
  it("does not mutate the document it is given", () => {
    const doc = docWith("A", "B");
    const snapshot = JSON.stringify(doc);
    moveTile(doc, doc.tiles[0].id, 1);
    deleteTile(doc, doc.tiles[0].id);
    expect(JSON.stringify(doc)).toBe(snapshot);
  });

  it("moves a tile among its siblings", () => {
    const doc = docWith("A", "B", "C");
    expect(labels(moveTile(doc, doc.tiles[0].id, 1).tiles)).toEqual(["B", "A", "C"]);
    expect(labels(moveTile(doc, doc.tiles[2].id, -1).tiles)).toEqual(["A", "C", "B"]);
  });

  it("leaves the order alone at the edges", () => {
    const doc = docWith("A", "B");
    expect(labels(moveTile(doc, doc.tiles[0].id, -1).tiles)).toEqual(["A", "B"]);
    expect(labels(moveTile(doc, doc.tiles[1].id, 1).tiles)).toEqual(["A", "B"]);
  });

  it("deletes a nested tile without touching its siblings", () => {
    let doc = docWith("A", "B");
    const child = createTile("content", { en: "child" });
    doc = insertTile(doc, doc.tiles[0].id, child);

    const after = deleteTile(doc, child.id);
    expect(after.tiles[0].children).toHaveLength(0);
    expect(labels(after.tiles)).toEqual(["A", "B"]);
  });

  it("turns a tile into a section when it gains a child", () => {
    const doc = docWith("A");
    expect(doc.tiles[0].kind).toBe("content");
    const after = insertTile(doc, doc.tiles[0].id, createTile("content", { en: "child" }));
    expect(after.tiles[0].kind).toBe("section");
  });

  describe("indent", () => {
    it("nests a tile under its previous sibling exactly once", () => {
      const doc = docWith("A", "B");
      const after = indentTile(doc, doc.tiles[1].id);

      expect(labels(after.tiles)).toEqual(["A"]);
      expect(labels(after.tiles[0].children)).toEqual(["B"]);
      // The moved tile must not be picked up again at its new depth.
      expect(after.tiles[0].children[0].children).toHaveLength(0);
    });

    it("refuses to nest the first tile in a level", () => {
      const doc = docWith("A", "B");
      expect(indentTile(doc, doc.tiles[0].id)).toEqual(doc);
    });

    it("refuses to nest into a kind that has no tile grid", () => {
      const doc = createEmptySiteDoc();
      doc.tiles = [createTile("issue-form", { en: "Report" }), createTile("content", { en: "B" })];
      expect(indentTile(doc, doc.tiles[1].id)).toEqual(doc);
    });

    it("works at a nested level too", () => {
      let doc = docWith("Root");
      const first = createTile("content", { en: "first" });
      const second = createTile("content", { en: "second" });
      doc = insertTile(doc, doc.tiles[0].id, first);
      doc = insertTile(doc, doc.tiles[0].id, second);

      const after = indentTile(doc, second.id);
      expect(labels(after.tiles[0].children)).toEqual(["first"]);
      expect(labels(after.tiles[0].children[0].children)).toEqual(["second"]);
    });
  });

  describe("outdent", () => {
    it("moves a tile out to sit after its former parent", () => {
      let doc = docWith("A", "C");
      const child = createTile("content", { en: "B" });
      doc = insertTile(doc, doc.tiles[0].id, child);

      const after = outdentTile(doc, child.id);
      expect(labels(after.tiles)).toEqual(["A", "B", "C"]);
      expect(after.tiles[0].children).toHaveLength(0);
    });

    it("is a no-op for a tile already at the top level", () => {
      const doc = docWith("A", "B");
      expect(outdentTile(doc, doc.tiles[0].id)).toEqual(doc);
    });

    it("reverses an indent", () => {
      const doc = docWith("A", "B");
      const id = doc.tiles[1].id;
      expect(labels(outdentTile(indentTile(doc, id), id).tiles)).toEqual(["A", "B"]);
    });
  });

  describe("duplicate", () => {
    it("inserts the copy directly after the original", () => {
      const doc = docWith("A", "B");
      const after = duplicateTile(doc, doc.tiles[0].id);
      expect(labels(after.tiles)).toEqual(["A", "A", "B"]);
    });

    it("gives every copied tile and block a fresh id", () => {
      let doc = docWith("A");
      doc = insertTile(doc, doc.tiles[0].id, createTile("content", { en: "child" }));
      doc = addBlock(doc, doc.tiles[0].children[0].id, "richText");

      const after = duplicateTile(doc, doc.tiles[0].id);
      const ids = allIds(after);
      expect(new Set(ids).size).toBe(ids.length);

      const blockIds = [...walkTiles(after.tiles)].flatMap((m) => m.tile.blocks.map((b) => b.id));
      expect(new Set(blockIds).size).toBe(blockIds.length);
    });

    it("keeps sibling slugs unique", () => {
      const doc = docWith("A", "B");
      const after = duplicateTile(doc, doc.tiles[0].id);
      expect(new Set(after.tiles.map((t) => t.slug)).size).toBe(3);
    });
  });

  it("updates a nested tile in place", () => {
    let doc = docWith("A");
    const child = createTile("content", { en: "child" });
    doc = insertTile(doc, doc.tiles[0].id, child);

    const after = updateTile(doc, child.id, { icon: "tabler:wifi" });
    expect(findTileById(after.tiles, child.id)?.tile.icon).toBe("tabler:wifi");
  });
});

describe("block mutations", () => {
  it("adds, reorders and removes blocks on the right tile", () => {
    let doc = docWith("A", "B");
    const tileId = doc.tiles[0].id;

    doc = addBlock(doc, tileId, "heading");
    doc = addBlock(doc, tileId, "richText");
    expect(doc.tiles[0].blocks.map((b) => b.type)).toEqual(["heading", "richText"]);
    expect(doc.tiles[1].blocks).toHaveLength(0);

    const firstId = doc.tiles[0].blocks[0].id;
    doc = moveBlock(doc, tileId, firstId, 1);
    expect(doc.tiles[0].blocks.map((b) => b.type)).toEqual(["richText", "heading"]);

    doc = removeBlock(doc, tileId, firstId);
    expect(doc.tiles[0].blocks.map((b) => b.type)).toEqual(["richText"]);
  });

  it("does not move a block past either end", () => {
    let doc = docWith("A");
    const tileId = doc.tiles[0].id;
    doc = addBlock(doc, tileId, "heading");
    doc = addBlock(doc, tileId, "divider");

    const ids = doc.tiles[0].blocks.map((b) => b.id);
    expect(moveBlock(doc, tileId, ids[0], -1).tiles[0].blocks.map((b) => b.id)).toEqual(ids);
    expect(moveBlock(doc, tileId, ids[1], 1).tiles[0].blocks.map((b) => b.id)).toEqual(ids);
  });

  it("patches block fields", () => {
    let doc = docWith("A");
    const tileId = doc.tiles[0].id;
    doc = addBlock(doc, tileId, "richText");
    const blockId = doc.tiles[0].blocks[0].id;

    doc = updateBlock(doc, tileId, blockId, { text: { en: "hello" } });
    const block = doc.tiles[0].blocks[0];
    expect(block.type === "richText" && block.text.en).toBe("hello");
  });

  it("edits blocks on a deeply nested tile", () => {
    let doc = docWith("Root");
    const child = createTile("content", { en: "child" });
    doc = insertTile(doc, doc.tiles[0].id, child);

    doc = addBlock(doc, child.id, "divider");
    expect(findTileById(doc.tiles, child.id)?.tile.blocks).toHaveLength(1);
  });
});

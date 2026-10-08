import { describe, expect, it } from "vitest";
import { parseSiteDoc, serializeSiteDoc } from "./repair";
import { createEmptySiteDoc } from "./schema";
import { createTile } from "./factories";

/*
 * A guest scanning a QR code must get a page even when the stored document is
 * old, partial or corrupt. These tests pin that guarantee down.
 */

describe("parseSiteDoc", () => {
  it("round-trips a valid document", () => {
    const doc = createEmptySiteDoc();
    doc.tiles.push(createTile("content", { en: "Wi-Fi" }));
    expect(parseSiteDoc(serializeSiteDoc(doc))).toEqual(doc);
  });

  it("accepts either a JSON string or an object", () => {
    const doc = createEmptySiteDoc();
    expect(parseSiteDoc(doc)).toEqual(parseSiteDoc(JSON.stringify(doc)));
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
    ["an array", [1, 2, 3]],
    ["invalid JSON", "{not json"],
    ["an empty string", ""],
    ["an empty object", {}],
  ])("never throws on %s", (_label, input) => {
    const doc = parseSiteDoc(input);
    expect(doc.version).toBe(1);
    expect(doc.locales.length).toBeGreaterThan(0);
    expect(Array.isArray(doc.tiles)).toBe(true);
  });

  it("keeps the good tiles and drops only the broken ones", () => {
    const doc = parseSiteDoc({
      version: 1,
      locales: ["en"],
      defaultLocale: "en",
      tiles: [
        { id: "a", slug: "ok", icon: "tabler:wifi", label: { en: "Ok" }, kind: "content" },
        "this is not a tile",
        null,
        { id: "b", slug: "also-ok", icon: "tabler:key", label: { en: "Also ok" }, kind: "content" },
      ],
    });

    expect(doc.tiles.map((t) => t.slug)).toEqual(["ok", "also-ok"]);
  });

  it("drops an unparseable block without losing its tile", () => {
    const doc = parseSiteDoc({
      tiles: [
        {
          id: "a",
          slug: "wifi",
          label: { en: "Wi-Fi" },
          kind: "content",
          blocks: [
            { id: "b1", type: "richText", text: { en: "keep me" } },
            { id: "b2", type: "notARealBlockType" },
            { id: "b3", type: "divider" },
          ],
        },
      ],
    });

    expect(doc.tiles).toHaveLength(1);
    expect(doc.tiles[0].blocks.map((b) => b.type)).toEqual(["richText", "divider"]);
  });

  it("clamps out-of-range theme values instead of rejecting the document", () => {
    const doc = parseSiteDoc({ theme: { radius: 9999, overlay: -50, font: "comic-sans" } });
    expect(doc.theme.radius).toBe(40);
    expect(doc.theme.overlay).toBe(0);
    expect(doc.theme.font).toBe("inter");
  });

  it("makes sibling slugs unique so a URL is never ambiguous", () => {
    const doc = parseSiteDoc({
      tiles: [
        { id: "a", slug: "wifi", label: {}, kind: "content" },
        { id: "b", slug: "wifi", label: {}, kind: "content" },
        { id: "c", slug: "wifi", label: {}, kind: "content" },
      ],
    });
    expect(new Set(doc.tiles.map((t) => t.slug)).size).toBe(3);
  });

  it("allows the same slug under different parents", () => {
    const doc = parseSiteDoc({
      tiles: [
        {
          id: "a",
          slug: "a",
          label: {},
          kind: "section",
          children: [{ id: "a1", slug: "info", label: {}, kind: "content" }],
        },
        {
          id: "b",
          slug: "b",
          label: {},
          kind: "section",
          children: [{ id: "b1", slug: "info", label: {}, kind: "content" }],
        },
      ],
    });

    expect(doc.tiles[0].children[0].slug).toBe("info");
    expect(doc.tiles[1].children[0].slug).toBe("info");
  });

  it("gives duplicated ids fresh ones so editor selection stays unambiguous", () => {
    const doc = parseSiteDoc({
      tiles: [
        { id: "same", slug: "one", label: {}, kind: "content" },
        { id: "same", slug: "two", label: {}, kind: "content" },
      ],
    });
    expect(doc.tiles[0].id).not.toBe(doc.tiles[1].id);
  });

  it("stops runaway nesting rather than recursing forever", () => {
    let nested: Record<string, unknown> = {
      id: "deep",
      slug: "deep",
      label: {},
      kind: "content",
      children: [],
    };
    for (let i = 0; i < 40; i++) {
      nested = { id: `n${i}`, slug: `n${i}`, label: {}, kind: "section", children: [nested] };
    }

    const doc = parseSiteDoc({ tiles: [nested] });
    let depth = 0;
    let cursor = doc.tiles[0];
    while (cursor?.children?.length) {
      depth++;
      cursor = cursor.children[0];
    }
    expect(depth).toBeLessThanOrEqual(6);
  });

  it("falls back to a valid locale set when the stored one is unusable", () => {
    const doc = parseSiteDoc({ locales: ["klingon", 7], defaultLocale: "klingon" });
    expect(doc.locales).toEqual(["en", "es", "pl"]);
    expect(doc.locales).toContain(doc.defaultLocale);
  });
});

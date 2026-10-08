import { describe, expect, it } from "vitest";
import { GUIDE } from "./guide";
import { LOCALES } from "@/site/schema";

describe("guide", () => {
  const ids = (locale: (typeof LOCALES)[number]) => GUIDE[locale].sections.map((section) => section.id);

  it("has the same sections, in the same order, in every language", () => {
    for (const locale of LOCALES) expect(ids(locale)).toEqual(ids("en"));
  });

  it("closes every **bold** and `code` mark", () => {
    for (const locale of LOCALES) {
      const text = JSON.stringify(GUIDE[locale]);
      expect(text.split("**").length % 2, `${locale}: unbalanced **`).toBe(1);
      expect(text.split("`").length % 2, `${locale}: unbalanced backtick`).toBe(1);
    }
  });
});

import { describe, expect, it } from "vitest";
import { isIssueStatus, parsePhotoUrls } from "./issues";
import { parseThemeChoice } from "./theme";

describe("parsePhotoUrls", () => {
  it("returns stored upload URLs", () => {
    expect(parsePhotoUrls('["/uploads/a.jpg","/uploads/b.png"]')).toEqual([
      "/uploads/a.jpg",
      "/uploads/b.png",
    ]);
  });

  it("never throws on broken JSON", () => {
    expect(parsePhotoUrls("not json")).toEqual([]);
    expect(parsePhotoUrls('{"url":"/uploads/a.jpg"}')).toEqual([]);
  });

  it("drops anything that is not one of our uploads", () => {
    // These end up in <img src> and <a href>, so only our own paths survive.
    expect(
      parsePhotoUrls('["javascript:alert(1)","https://evil.example/x.png",42,null,"/uploads/ok.webp"]'),
    ).toEqual(["/uploads/ok.webp"]);
  });
});

describe("isIssueStatus", () => {
  it("accepts only known statuses", () => {
    expect(isIssueStatus("new")).toBe(true);
    expect(isIssueStatus("resolved")).toBe(true);
    expect(isIssueStatus("deleted")).toBe(false);
    expect(isIssueStatus(null)).toBe(false);
  });
});

describe("parseThemeChoice", () => {
  it("keeps an explicit choice and ignores anything else", () => {
    expect(parseThemeChoice("dark")).toBe("dark");
    expect(parseThemeChoice("light")).toBe("light");
    expect(parseThemeChoice("system")).toBeNull();
    expect(parseThemeChoice('"><script>')).toBeNull();
    expect(parseThemeChoice(undefined)).toBeNull();
  });
});

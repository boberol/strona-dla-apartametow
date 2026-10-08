import { describe, expect, it } from "vitest";
import {
  hashPassword,
  isEmailShaped,
  normalizeEmail,
  passwordProblem,
  verifyPassword,
} from "./auth";

describe("password hashing", () => {
  it("accepts the correct password", () => {
    const stored = hashPassword("correct horse battery");
    expect(verifyPassword("correct horse battery", stored)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const stored = hashPassword("correct horse battery");
    expect(verifyPassword("correct horse batteryy", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("never stores the password itself", () => {
    const stored = hashPassword("hunter2hunter2");
    expect(stored).not.toContain("hunter2hunter2");
    expect(stored.startsWith("scrypt$")).toBe(true);
  });

  it("salts, so the same password hashes differently every time", () => {
    const a = hashPassword("same password");
    const b = hashPassword("same password");
    expect(a).not.toBe(b);
    expect(verifyPassword("same password", a)).toBe(true);
    expect(verifyPassword("same password", b)).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["garbage", "not-a-hash"],
    ["wrong scheme", "bcrypt$1$2$3$4$5"],
    ["truncated", "scrypt$16384$8$1$abc"],
  ])("returns false rather than throwing on a %s hash", (_label, stored) => {
    expect(() => verifyPassword("anything", stored)).not.toThrow();
    expect(verifyPassword("anything", stored)).toBe(false);
  });
});

describe("input validation", () => {
  it("requires at least 8 characters", () => {
    expect(passwordProblem("short")).toBe("too-short");
    expect(passwordProblem("12345678")).toBeNull();
  });

  it("lowercases and trims emails so one address is one account", () => {
    expect(normalizeEmail("  Owner@Example.COM ")).toBe("owner@example.com");
  });

  it.each([
    ["owner@example.com", true],
    ["a@b.co", true],
    ["no-at-sign", false],
    ["missing@tld", false],
    ["two@@at.com", false],
    ["", false],
  ])("checks the shape of %s", (email, valid) => {
    expect(isEmailShaped(email)).toBe(valid);
  });
});

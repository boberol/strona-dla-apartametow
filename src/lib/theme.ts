/*
 * The partner panel's light/dark preference.
 *
 * Stored in a cookie rather than localStorage so the server can render the
 * right palette on the first byte. With no cookie the OS preference decides,
 * via a CSS media query, so first-time visitors never see a flash either.
 */

export const THEME_COOKIE = "sg_theme";

export type ThemeChoice = "light" | "dark";

export function parseThemeChoice(value: string | undefined): ThemeChoice | null {
  return value === "light" || value === "dark" ? value : null;
}

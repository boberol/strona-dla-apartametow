import { FONT_STACKS, type SiteDoc } from "./schema";

/**
 * The whole theme travels as CSS custom properties on the guest root element,
 * so a theme change is a style recalculation rather than a re-render, and the
 * editor preview updates instantly.
 */
export function themeToCssVars(doc: SiteDoc): Record<string, string> {
  const t = doc.theme;
  return {
    "--brand": t.brand,
    "--accent": t.accent,
    "--tile-bg": t.tileBg,
    "--tile-text": t.tileText,
    "--card-bg": t.cardBg,
    "--card-text": t.cardText,
    "--radius": `${t.radius}px`,
    "--font-body": FONT_STACKS[t.font],
    "--overlay": String(t.overlay / 100),
    "--bg-color": doc.background.color,
  };
}

/** Google Fonts families needed by the chosen theme font. */
export const FONT_QUERY: Record<string, string> = {
  inter: "Inter:wght@400;500;600;700",
  playfair: "Playfair+Display:wght@400;500;600;700",
  dmsans: "DM+Sans:wght@400;500;700",
  lora: "Lora:wght@400;500;600;700",
};

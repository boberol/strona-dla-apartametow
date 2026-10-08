import { Icon } from "@/components/guest/Icon";
import { themeToCssVars } from "@/site/theme";
import { pick, type Locale, type SiteDoc } from "@/site/schema";
import { visibleTiles } from "@/site/navigation";

/**
 * Static look-preview of a template, shown while choosing one.
 *
 * It reuses the guest app's theme variables and tile classes so the colours,
 * rounding and tile style are genuinely the template's own. Once a template is
 * chosen, the editor previews the real guest app in an iframe instead.
 */
export function TemplatePreview({ doc, locale }: { doc: SiteDoc; locale: Locale }) {
  const styleVars = themeToCssVars(doc) as React.CSSProperties;
  const tiles = visibleTiles(doc.tiles);
  const logoText = pick(doc.header.logoText, locale, doc.defaultLocale);

  return (
    <div className="gg-root relative flex flex-col" style={styleVars}>
      <div className="gg-bg-fallback absolute inset-0" style={{ position: "absolute" }} />

      <header className="relative flex items-center justify-between px-4 py-3.5">
        <span className="truncate text-sm font-semibold text-white">{logoText}</span>
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-white/70">
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/90 px-1.5 text-black">
            en
          </span>
          <span className="px-1">es</span>
          <span className="px-1">pl</span>
        </span>
      </header>

      <div className="relative grid grid-cols-2 gap-2.5 px-3 pb-6">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className="gg-tile flex min-h-28 flex-col items-center justify-center gap-2 p-3 text-center shadow-lg"
          >
            <Icon name={tile.icon} size={24} />
            <span className="text-[11px] font-medium leading-tight">
              {pick(tile.label, locale, doc.defaultLocale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

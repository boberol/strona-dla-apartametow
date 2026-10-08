import { resolveIcon } from "@/site/icons";

/**
 * Renders an Iconify icon as inline SVG on the server.
 *
 * `body` comes from icon sets bundled at build time, never from user input --
 * the owner only chooses a name, and an unknown name resolves to null.
 */
export async function Icon({
  name,
  className,
  size = 28,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const icon = await resolveIcon(name);
  if (!icon) return null;

  return (
    <svg
      viewBox={icon.viewBox}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}

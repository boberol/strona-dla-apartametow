import { NextResponse } from "next/server";
import { resolveIcon, searchIcons } from "@/site/icons";

/**
 * Icon picker search, or one icon by exact name (`?name=tabler:wifi`) for
 * showing the current choice.
 *
 * Deliberately searches the same sets that are bundled for server rendering,
 * so an owner can never pick an icon the guest app is unable to draw.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const name = params.get("name");
  if (name !== null) {
    const icon = await resolveIcon(name, false);
    return NextResponse.json({ icon: icon ? { name, ...icon } : null });
  }

  return NextResponse.json({ icons: await searchIcons(params.get("q") ?? "", 60) });
}

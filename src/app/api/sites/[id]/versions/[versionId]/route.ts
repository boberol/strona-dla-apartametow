import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accessProperty } from "@/lib/guard";
import { parseSiteDoc } from "@/site/repair";

/**
 * One snapshot's document, for restoring into the draft. The editor then
 * saves it through the normal autosave, so restoring is subject to the same
 * subscription check as any other edit, and never touches what guests see
 * until the owner publishes.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  const { id, versionId } = await params;
  const result = await accessProperty(id);
  if (!result.ok) {
    const status = result.reason === "unauthenticated" ? 401 : 404;
    return NextResponse.json({ error: result.reason }, { status });
  }

  // Scoped to this property, so a version id from another apartment is a 404.
  const version = await db.siteVersion.findFirst({ where: { id: versionId, propertyId: id } });
  if (!version) return NextResponse.json({ error: "not-found" }, { status: 404 });

  return NextResponse.json({ doc: parseSiteDoc(version.doc) });
}

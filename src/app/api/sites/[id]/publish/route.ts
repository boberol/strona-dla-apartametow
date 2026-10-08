import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accessProperty } from "@/lib/guard";

/**
 * Publishing copies draft over published and snapshots the result, so a bad
 * publish can be rolled back to any earlier version.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await accessProperty(id);

  if (!result.ok) {
    const status = result.reason === "unauthenticated" ? 401 : 404;
    return NextResponse.json({ error: result.reason }, { status });
  }
  if (!result.access.canEdit) {
    return NextResponse.json({ error: "subscription-required" }, { status: 402 });
  }

  const property = await db.property.findUniqueOrThrow({
    where: { id },
    select: { draft: true },
  });
  const publishedAt = new Date();

  await db.$transaction([
    db.property.update({ where: { id }, data: { published: property.draft, publishedAt } }),
    db.siteVersion.create({ data: { propertyId: id, doc: property.draft } }),
  ]);

  return NextResponse.json({ ok: true, publishedAt: publishedAt.toISOString() });
}

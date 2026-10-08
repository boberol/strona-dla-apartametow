import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accessProperty } from "@/lib/guard";
import { parseSiteDoc, serializeSiteDoc } from "@/site/repair";

/** Autosave: replaces the draft document. Never touches what guests see. */
export async function PATCH(
  request: Request,
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

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad-body" }, { status: 400 });
  }

  // Validate before storing, so a malformed draft can never reach the database.
  const doc = parseSiteDoc((body as { doc?: unknown }).doc);

  const updated = await db.property.update({
    where: { id },
    data: { draft: serializeSiteDoc(doc) },
    select: { published: true, draft: true },
  });

  return NextResponse.json({
    ok: true,
    hasUnpublishedChanges: updated.draft !== updated.published,
  });
}

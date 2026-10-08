import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accessProperty } from "@/lib/guard";

/** Published snapshots of one apartment, newest first. Owner only. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await accessProperty(id);
  if (!result.ok) {
    const status = result.reason === "unauthenticated" ? 401 : 404;
    return NextResponse.json({ error: result.reason }, { status });
  }

  const versions = await db.siteVersion.findMany({
    where: { propertyId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, createdAt: true },
  });
  return NextResponse.json({ versions });
}

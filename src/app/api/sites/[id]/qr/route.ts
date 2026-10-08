import { NextResponse } from "next/server";
import { accessProperty } from "@/lib/guard";
import { db } from "@/lib/db";
import { qrPng, qrSvg } from "@/lib/qr";

/**
 * Downloads the property's QR code as PNG (default) or SVG.
 *
 * Not gated on the subscription: an owner can always reprint the code that is
 * already hanging in their apartment.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await accessProperty(id);

  if (!result.ok) {
    const status = result.reason === "unauthenticated" ? 401 : 404;
    return NextResponse.json({ error: result.reason }, { status });
  }

  const property = await db.property.findUniqueOrThrow({
    where: { id },
    select: { slug: true, shortCode: true },
  });

  const format = new URL(request.url).searchParams.get("format") === "svg" ? "svg" : "png";
  const filename = `stayguide-qr-${property.slug}.${format}`;
  const headers = {
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": "private, no-store",
  };

  if (format === "svg") {
    return new NextResponse(await qrSvg(property.shortCode), {
      headers: { ...headers, "content-type": "image/svg+xml; charset=utf-8" },
    });
  }

  return new NextResponse(new Uint8Array(await qrPng(property.shortCode)), {
    headers: { ...headers, "content-type": "image/png" },
  });
}

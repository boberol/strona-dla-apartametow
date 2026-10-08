import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { saveUpload } from "@/lib/storage";
import { notifyNewReport } from "@/lib/inbox";
import { LOCALES } from "@/site/schema";

const MAX_PHOTOS = 5;
const MAX_DESCRIPTION = 4000;

export async function POST(request: Request) {
  const form = await request.formData();

  const propertyId = String(form.get("propertyId") ?? "");
  const description = String(form.get("description") ?? "").trim();
  const localeRaw = String(form.get("locale") ?? "en");
  const locale = (LOCALES as readonly string[]).includes(localeRaw) ? localeRaw : "en";

  if (!propertyId || !description) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  // Confirm the property exists before storing anything against it.
  const property = await db.property.findUnique({
    where: { id: propertyId },
    select: { id: true },
  });
  if (!property) return NextResponse.json({ error: "unknown-property" }, { status: 404 });

  const photos = form.getAll("photos").filter((v): v is File => v instanceof File);
  const urls: string[] = [];
  for (const photo of photos.slice(0, MAX_PHOTOS)) {
    const saved = await saveUpload(photo);
    if (saved.ok) urls.push(saved.url);
  }

  const saved = description.slice(0, MAX_DESCRIPTION);
  await db.issueReport.create({
    data: { propertyId, description: saved, photoUrls: JSON.stringify(urls), locale },
  });

  await notifyNewReport(propertyId, saved);

  return NextResponse.json({ ok: true });
}

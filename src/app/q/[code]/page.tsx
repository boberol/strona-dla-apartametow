import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";

/**
 * Permanent target for printed QR codes.
 *
 * Printed material cannot be changed, so the code embeds an immutable
 * shortCode rather than the slug. Renaming a property, changing its slug or
 * moving it to a custom domain never invalidates a printed card.
 *
 * A page rather than a route handler so an unknown code shows the guest a
 * readable 404 in their language instead of a JSON error.
 */
export default async function QrRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const property = await db.property.findUnique({
    where: { shortCode: code },
    select: { slug: true },
  });

  if (!property) notFound();
  redirect(`/s/${property.slug}`);
}

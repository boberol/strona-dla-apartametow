"use server";

import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { currentOrg } from "@/lib/guard";
import { canAddProperty } from "@/lib/subscription";
import { serializeSiteDoc } from "@/site/repair";
import { slugify } from "@/site/factories";
import { buildTemplate, isTemplateId } from "@/site/templates";
import { isBillingInterval, isPlanId } from "@/lib/plans";

/** Slugs are global (they address a guest site), so resolve collisions here. */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "stay";
  let candidate = base;
  let n = 2;

  while (await db.property.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${n++}`;
  }
  return candidate;
}

export async function createFromTemplate(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const templateId = String(formData.get("template") ?? "");
  const name = String(formData.get("name") ?? "").trim() || "My apartment";

  const session = await currentOrg();
  if (!session) redirect(`/${locale}/login`);
  if (!isTemplateId(templateId)) redirect(`/${locale}/onboarding/template?error=template`);

  const count = await db.property.count({ where: { orgId: session.org.id } });
  if (!canAddProperty(session.org, count)) {
    redirect(`/${locale}/onboarding/template?error=limit`);
  }

  const doc = buildTemplate(templateId, name);
  const serialized = serializeSiteDoc(doc);

  const property = await db.property.create({
    data: {
      orgId: session.org.id,
      slug: await uniqueSlug(name),
      name,
      shortCode: nanoid(8),
      draft: serialized,
      // A new site is published immediately so the QR code works from day one.
      published: serialized,
      publishedAt: new Date(),
    },
  });

  await db.siteVersion.create({ data: { propertyId: property.id, doc: serialized } });

  // A plan chosen on the pricing page before signup is confirmed next; the
  // payment itself still needs the owner to press the button.
  const plan = formData.get("plan");
  const interval = formData.get("interval");
  if (isPlanId(plan) && isBillingInterval(interval)) {
    redirect(`/${locale}/dashboard/billing?plan=${plan}&interval=${interval}#confirm`);
  }

  redirect(`/${locale}/dashboard/sites/${property.id}`);
}

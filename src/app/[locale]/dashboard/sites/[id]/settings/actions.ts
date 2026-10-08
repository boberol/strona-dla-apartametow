"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { accessProperty } from "@/lib/guard";
import { slugify } from "@/site/factories";

/*
 * Apartment settings. Every action proves ownership through accessProperty;
 * someone else's apartment id behaves exactly like one that does not exist.
 */

async function owned(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const result = await accessProperty(id);
  if (!result.ok) {
    if (result.reason === "unauthenticated") redirect(`/${locale}/login`);
    redirect(`/${locale}/dashboard`);
  }
  const back = `/${locale}/dashboard/sites/${id}/settings`;
  return { locale, id, access: result.access, back };
}

export async function renameProperty(formData: FormData) {
  const { id, access, back } = await owned(formData);
  if (!access.canEdit) redirect(`${back}?error=subscription`);

  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) redirect(`${back}?error=name`);

  await db.property.update({ where: { id }, data: { name } });
  redirect(`${back}?saved=name`);
}

/**
 * Changes the guest address /s/{slug}. Printed QR codes are unaffected --
 * they point at the permanent /q/{shortCode} -- but links shared by hand
 * break, which the page says before anyone presses the button.
 */
export async function changeSlug(formData: FormData) {
  const { id, access, back } = await owned(formData);
  if (!access.canEdit) redirect(`${back}?error=subscription`);

  const raw = String(formData.get("slug") ?? "").trim();
  const slug = raw ? slugify(raw) : "";
  if (slug.length < 3) redirect(`${back}?error=slug`);
  if (slug === access.property.slug) redirect(back);

  const taken = await db.property.findUnique({ where: { slug }, select: { id: true } });
  if (taken) redirect(`${back}?error=slug-taken`);

  await db.property.update({ where: { id }, data: { slug } });
  redirect(`${back}?saved=slug`);
}

/** Deleting is allowed even after a trial ends: it only ever reduces what exists. */
export async function deleteProperty(formData: FormData) {
  const { locale, id, back } = await owned(formData);

  const property = await db.property.findUniqueOrThrow({ where: { id }, select: { name: true } });
  const typed = String(formData.get("confirm") ?? "").trim();
  if (typed !== property.name.trim()) redirect(`${back}?error=confirm`);

  // Versions and guest reports cascade with it.
  await db.property.delete({ where: { id } });
  redirect(`/${locale}/dashboard?deleted=1`);
}

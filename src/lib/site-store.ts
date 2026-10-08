import { db } from "./db";
import { ownsSlug } from "./guard";
import { parseSiteDoc } from "@/site/repair";
import type { SiteDoc } from "@/site/schema";

export type LoadedSite = {
  id: string;
  slug: string;
  name: string;
  shortCode: string;
  doc: SiteDoc;
  isDraft: boolean;
  hasUnpublishedChanges: boolean;
  publishedAt: Date | null;
};

/**
 * Loads a guest site. `preview` reads the owner's unpublished draft; everyone
 * else gets `published`. A site that has never been published has no public
 * version at all, which the route turns into a 404 rather than an empty grid.
 */
export async function loadSite(slug: string, preview: boolean): Promise<LoadedSite | null> {
  const property = await db.property.findUnique({ where: { slug } });
  if (!property) return null;

  const source = preview ? property.draft : property.published;
  if (source === null || source === undefined) return null;

  return {
    id: property.id,
    slug: property.slug,
    name: property.name,
    shortCode: property.shortCode,
    doc: parseSiteDoc(source),
    isDraft: preview,
    hasUnpublishedChanges: property.draft !== property.published,
    publishedAt: property.publishedAt,
  };
}

export async function loadDraft(id: string) {
  const property = await db.property.findUnique({ where: { id } });
  if (!property) return null;
  return {
    id: property.id,
    slug: property.slug,
    name: property.name,
    doc: parseSiteDoc(property.draft),
    hasUnpublishedChanges: property.draft !== property.published,
    publishedAt: property.publishedAt,
  };
}

/**
 * `?preview=1` exposes an unpublished draft, which can contain door codes and
 * passwords not meant to be live yet. Only the organisation that owns this
 * site gets it; everyone else silently sees the published version.
 */
export async function previewAllowed(requested: boolean, slug: string): Promise<boolean> {
  if (!requested) return false;
  return ownsSlug(slug);
}

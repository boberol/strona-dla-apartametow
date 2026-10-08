import { db } from "./db";
import { getSessionUser, type SessionUser } from "./auth";
import { canEdit } from "./subscription";

/*
 * Authorisation helpers.
 *
 * Now that one deployment holds many organisations, knowing *who* is signed in
 * is not enough: every write has to prove the target property belongs to the
 * caller's organisation. Route handlers go through here rather than checking
 * a session and then trusting the id in the URL.
 */

export type PropertyAccess = {
  user: SessionUser;
  property: { id: string; slug: string; orgId: string };
  canEdit: boolean;
};

export type AccessFailure = "unauthenticated" | "not-found" | "read-only";

/**
 * Resolves a property the signed-in user is allowed to act on.
 *
 * A property owned by someone else returns "not-found" rather than
 * "forbidden", so the response cannot be used to probe which ids exist.
 */
export async function accessProperty(
  propertyId: string,
): Promise<{ ok: true; access: PropertyAccess } | { ok: false; reason: AccessFailure }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const property = await db.property.findUnique({
    where: { id: propertyId },
    select: { id: true, slug: true, orgId: true },
  });

  if (!property || property.orgId !== user.orgId) {
    return { ok: false, reason: "not-found" };
  }

  const org = await db.organization.findUniqueOrThrow({
    where: { id: user.orgId },
    select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
  });

  return { ok: true, access: { user, property, canEdit: canEdit(org) } };
}

/** True when the signed-in user's organisation owns the property with this slug. */
export async function ownsSlug(slug: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const property = await db.property.findUnique({
    where: { slug },
    select: { orgId: true },
  });
  return property?.orgId === user.orgId;
}

export async function currentOrg() {
  const user = await getSessionUser();
  if (!user) return null;

  const org = await db.organization.findUnique({ where: { id: user.orgId } });
  return org ? { user, org } : null;
}

/**
 * The signed-in platform admin, or null. Admin pages treat null as "not found"
 * rather than "forbidden", so the admin area does not advertise itself.
 */
export async function currentAdmin() {
  const user = await getSessionUser();
  return user?.isAdmin ? user : null;
}

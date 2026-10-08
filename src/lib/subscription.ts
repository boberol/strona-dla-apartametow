import { PLANS, TRIAL_DAYS, type PlanId } from "./plans";

/*
 * What an organisation is allowed to do right now.
 *
 * Deliberately pure and separate from Stripe: entitlements are decided by our
 * own database, and Stripe webhooks only ever update the fields this reads.
 */

export type OrgLike = {
  plan: string | null;
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
};

export type AccessState =
  | { kind: "trialing"; daysLeft: number }
  | { kind: "active" }
  | { kind: "prepaid"; daysLeft: number }
  | { kind: "past_due" }
  | { kind: "trial_expired" }
  | { kind: "prepaid_expired" }
  | { kind: "canceled" };

const DAY = 24 * 60 * 60 * 1000;

const daysUntil = (end: Date, now: Date) => Math.ceil((end.getTime() - now.getTime()) / DAY);

export function accessState(org: OrgLike, now = new Date()): AccessState {
  if (org.status === "active") return { kind: "active" };
  if (org.status === "past_due") return { kind: "past_due" };
  if (org.status === "canceled") return { kind: "canceled" };

  // A one-off payment covers a fixed period and never renews by itself.
  if (org.status === "prepaid") {
    const end = org.currentPeriodEnd;
    if (!end || end.getTime() <= now.getTime()) return { kind: "prepaid_expired" };
    return { kind: "prepaid", daysLeft: daysUntil(end, now) };
  }

  const ends = org.trialEndsAt;
  if (!ends) return { kind: "trial_expired" };
  if (ends.getTime() <= now.getTime()) return { kind: "trial_expired" };

  return { kind: "trialing", daysLeft: daysUntil(ends, now) };
}

/**
 * Editing stops when the trial runs out, but published guest sites stay up.
 * A guest standing in the apartment should never be shown a billing problem
 * that is between us and the owner.
 */
export function canEdit(org: OrgLike, now = new Date()): boolean {
  const { kind } = accessState(org, now);
  return kind === "trialing" || kind === "active" || kind === "prepaid" || kind === "past_due";
}

/** A prepaid year close to its end deserves a renewal reminder. */
export const PREPAID_REMINDER_DAYS = 30;

/**
 * Until when the organisation already has access it does not pay for again:
 * the rest of its trial, or the rest of a prepaid period. Starting a paid
 * plan picks up from here, so choosing a plan never loses days or grants a
 * second trial.
 */
export function coveredUntil(org: OrgLike, now = new Date()): Date | null {
  const state = accessState(org, now);
  if (state.kind === "trialing") return org.trialEndsAt;
  if (state.kind === "prepaid") return org.currentPeriodEnd;
  return null;
}

export function maxProperties(org: OrgLike): number {
  if (org.plan && org.plan in PLANS) return PLANS[org.plan as PlanId].maxProperties;
  // During a trial with no plan chosen yet, allow a single apartment.
  return 1;
}

export function canAddProperty(org: OrgLike, currentCount: number, now = new Date()): boolean {
  return canEdit(org, now) && currentCount < maxProperties(org);
}

export function trialEndDate(from = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * DAY);
}

/** One calendar year later, which is what a prepaid year buys. */
export function addYear(from: Date): Date {
  const next = new Date(from);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

import { PLANS, isPlanId } from "./plans";
import { accessState, type OrgLike } from "./subscription";

/*
 * Numbers for the admin overview. Pure, so they are tested without a database.
 */

type OrgWithBilling = OrgLike & { billingInterval: string | null };

/**
 * Estimated monthly revenue, net, in grosze: what paying organisations bring
 * in per month on average. A yearly subscription or prepaid year counts as a
 * twelfth of its price. Trials, lapsed and canceled accounts count as nothing.
 */
export function estimatedMonthlyRevenue(orgs: OrgWithBilling[], now = new Date()): number {
  let total = 0;
  for (const org of orgs) {
    if (!isPlanId(org.plan)) continue;
    const plan = PLANS[org.plan];
    const { kind } = accessState(org, now);

    if (kind === "prepaid") total += plan.yearly / 12;
    else if (kind === "active" || kind === "past_due") {
      total += org.billingInterval === "yearly" ? plan.yearly / 12 : plan.monthly;
    }
  }
  return Math.round(total);
}

export type AccountSummary = {
  paying: number;
  trialing: number;
  lapsed: number;
};

/** Paying = active, past due or prepaid; lapsed = trial or prepaid ended, or canceled. */
export function summarizeAccounts(orgs: OrgLike[], now = new Date()): AccountSummary {
  const summary: AccountSummary = { paying: 0, trialing: 0, lapsed: 0 };
  for (const org of orgs) {
    const { kind } = accessState(org, now);
    if (kind === "active" || kind === "past_due" || kind === "prepaid") summary.paying++;
    else if (kind === "trialing") summary.trialing++;
    else summary.lapsed++;
  }
  return summary;
}

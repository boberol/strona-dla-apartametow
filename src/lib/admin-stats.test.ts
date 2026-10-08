import { describe, expect, it } from "vitest";
import { estimatedMonthlyRevenue, summarizeAccounts } from "./admin-stats";

const NOW = new Date("2026-06-15T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

const org = (over: Record<string, unknown> = {}) => ({
  plan: null as string | null,
  status: "trialing",
  trialEndsAt: days(7) as Date | null,
  currentPeriodEnd: null as Date | null,
  billingInterval: null as string | null,
  ...over,
});

describe("estimatedMonthlyRevenue", () => {
  it("counts monthly subscriptions at their monthly price", () => {
    expect(estimatedMonthlyRevenue([org({ plan: "one", status: "active", billingInterval: "monthly" })], NOW)).toBe(4900);
  });

  it("spreads yearly subscriptions and prepaid years over twelve months", () => {
    const yearly = org({ plan: "complex", status: "active", billingInterval: "yearly" });
    const prepaid = org({ plan: "one", status: "prepaid", currentPeriodEnd: days(100) });
    expect(estimatedMonthlyRevenue([yearly, prepaid], NOW)).toBe(Math.round(149000 / 12 + 49000 / 12));
  });

  it("ignores trials, lapsed prepaid years and unknown plans", () => {
    expect(
      estimatedMonthlyRevenue(
        [
          org({ plan: "pro" }),
          org({ plan: "pro", status: "prepaid", currentPeriodEnd: days(-1) }),
          org({ plan: "enterprise", status: "active" }),
        ],
        NOW,
      ),
    ).toBe(0);
  });
});

describe("summarizeAccounts", () => {
  it("sorts accounts into paying, trialing and lapsed", () => {
    expect(
      summarizeAccounts(
        [
          org(),
          org({ status: "active" }),
          org({ status: "prepaid", currentPeriodEnd: days(30) }),
          org({ status: "past_due" }),
          org({ trialEndsAt: days(-2) }),
          org({ status: "canceled" }),
        ],
        NOW,
      ),
    ).toEqual({ paying: 3, trialing: 1, lapsed: 2 });
  });
});

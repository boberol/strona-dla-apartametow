import { describe, expect, it } from "vitest";
import { accessState, addYear, canAddProperty, canEdit, coveredUntil, maxProperties, trialEndDate } from "./subscription";

const NOW = new Date("2026-06-15T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

const org = (over: Partial<Parameters<typeof accessState>[0]> = {}) => ({
  plan: null,
  status: "trialing",
  trialEndsAt: days(7),
  currentPeriodEnd: null,
  ...over,
});

describe("accessState", () => {
  it("counts remaining trial days", () => {
    expect(accessState(org({ trialEndsAt: days(7) }), NOW)).toEqual({ kind: "trialing", daysLeft: 7 });
  });

  it("rounds a part-day up, so the last day still reads as 1", () => {
    const state = accessState(org({ trialEndsAt: new Date(NOW.getTime() + 3_600_000) }), NOW);
    expect(state).toEqual({ kind: "trialing", daysLeft: 1 });
  });

  it("expires the trial once the date passes", () => {
    expect(accessState(org({ trialEndsAt: days(-1) }), NOW)).toEqual({ kind: "trial_expired" });
  });

  it("treats a missing trial date as expired rather than unlimited", () => {
    expect(accessState(org({ trialEndsAt: null }), NOW)).toEqual({ kind: "trial_expired" });
  });

  it("lets a paid subscription override an elapsed trial", () => {
    const state = accessState(org({ status: "active", trialEndsAt: days(-30) }), NOW);
    expect(state).toEqual({ kind: "active" });
  });

  it.each([
    ["past_due", "past_due"],
    ["canceled", "canceled"],
  ])("maps the %s status through", (status, kind) => {
    expect(accessState(org({ status }), NOW).kind).toBe(kind);
  });
});

describe("canEdit", () => {
  it("allows editing while trialing, active or past due", () => {
    expect(canEdit(org(), NOW)).toBe(true);
    expect(canEdit(org({ status: "active" }), NOW)).toBe(true);
    // Past due is a payment problem, not a reason to lock someone out mid-fix.
    expect(canEdit(org({ status: "past_due" }), NOW)).toBe(true);
  });

  it("blocks editing once the trial expires or the plan is canceled", () => {
    expect(canEdit(org({ trialEndsAt: days(-1) }), NOW)).toBe(false);
    expect(canEdit(org({ status: "canceled" }), NOW)).toBe(false);
  });
});

describe("property limits", () => {
  it("allows one apartment during a trial with no plan chosen", () => {
    expect(maxProperties(org())).toBe(1);
    expect(canAddProperty(org(), 0, NOW)).toBe(true);
    expect(canAddProperty(org(), 1, NOW)).toBe(false);
  });

  it("uses the plan's limit once one is chosen", () => {
    expect(maxProperties(org({ plan: "one" }))).toBe(1);
    expect(maxProperties(org({ plan: "complex" }))).toBe(5);
    expect(maxProperties(org({ plan: "pro" }))).toBe(25);
  });

  it("ignores an unknown plan rather than granting unlimited apartments", () => {
    expect(maxProperties(org({ plan: "enterprise-unlimited" }))).toBe(1);
  });

  it("refuses new apartments once editing is blocked, whatever the limit says", () => {
    const expired = org({ plan: "pro", trialEndsAt: days(-1) });
    expect(maxProperties(expired)).toBe(25);
    expect(canAddProperty(expired, 0, NOW)).toBe(false);
  });
});

describe("trialEndDate", () => {
  it("is 14 days out", () => {
    expect(trialEndDate(NOW).toISOString()).toBe(days(14).toISOString());
  });
});

describe("prepaid years", () => {
  it("counts the days left of a prepaid year", () => {
    expect(accessState(org({ status: "prepaid", currentPeriodEnd: days(40) }), NOW)).toEqual({ kind: "prepaid", daysLeft: 40 });
  });

  it("ends the year on its date, and a missing date counts as ended", () => {
    expect(accessState(org({ status: "prepaid", currentPeriodEnd: days(-1) }), NOW)).toEqual({ kind: "prepaid_expired" });
    expect(accessState(org({ status: "prepaid", currentPeriodEnd: null }), NOW)).toEqual({ kind: "prepaid_expired" });
  });

  it("allows editing during the year, not after it", () => {
    expect(canEdit(org({ status: "prepaid", currentPeriodEnd: days(1) }), NOW)).toBe(true);
    expect(canEdit(org({ status: "prepaid", currentPeriodEnd: days(-1) }), NOW)).toBe(false);
  });
});

describe("coveredUntil", () => {
  it("is the trial end during a trial", () => {
    expect(coveredUntil(org({ trialEndsAt: days(5) }), NOW)).toEqual(days(5));
  });

  it("is the end of a running prepaid year", () => {
    expect(coveredUntil(org({ status: "prepaid", currentPeriodEnd: days(90) }), NOW)).toEqual(days(90));
  });

  it("is nothing once cover has run out, or for a subscription billed by Stripe", () => {
    expect(coveredUntil(org({ trialEndsAt: days(-1) }), NOW)).toBeNull();
    expect(coveredUntil(org({ status: "active" }), NOW)).toBeNull();
  });
});

describe("addYear", () => {
  it("moves the calendar year, not 365 days", () => {
    expect(addYear(new Date("2027-03-01T10:00:00Z")).toISOString()).toBe("2028-03-01T10:00:00.000Z");
  });
});

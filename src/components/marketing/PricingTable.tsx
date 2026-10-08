"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PanelIcon } from "@/components/panel/icons";
import {
  BILLING_INTERVALS,
  PLANS,
  PLAN_IDS,
  formatPln,
  planPrice,
  yearlySavingMonths,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans";

const PLAN_NAME_KEY: Record<PlanId, string> = {
  one: "planOneName",
  complex: "planComplexName",
  pro: "planProName",
};

const PLAN_FOR_KEY: Record<PlanId, string> = {
  one: "planOneFor",
  complex: "planComplexFor",
  pro: "planProFor",
};

const FEATURE_KEY: Record<string, string> = {
  branded: "featureBranded",
  issueForm: "featureIssueForm",
  reviews: "featureReviews",
  multiUnit: "featureMultiUnit",
  oneQr: "featureOneQr",
  issueRoom: "featureIssueRoom",
  manyProperties: "featureManyProperties",
  separateQr: "featureSeparateQr",
  separateForms: "featureSeparateForms",
  consistent: "featureConsistent",
};

export function PricingTable({
  locale,
  signedIn,
  currentPlan,
}: {
  locale: string;
  signedIn: boolean;
  currentPlan?: string | null;
}) {
  const t = useTranslations("billing");
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div className="panel-segment" role="group">
          {BILLING_INTERVALS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setInterval(option)}
              aria-pressed={interval === option}
              className="!px-5 !py-1.5"
            >
              {t(option)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {PLAN_IDS.map((id) => {
          const plan = PLANS[id];
          const price = planPrice(plan, interval);
          const isCurrent = currentPlan === id;
          const featured = id === "complex";

          const href = signedIn
            ? `/${locale}/dashboard/billing?plan=${id}&interval=${interval}`
            : `/${locale}/signup?plan=${id}&interval=${interval}`;

          return (
            <div
              key={id}
              className={`panel-surface flex flex-col p-6 ${
                featured ? "!border-[var(--p-accent)] ring-1 ring-[var(--p-accent)]" : ""
              }`}
            >
              <h3 className="font-semibold">{t(PLAN_NAME_KEY[id])}</h3>
              <p className="panel-muted mt-1 min-h-[2.5rem] text-sm leading-snug">
                {t(PLAN_FOR_KEY[id])}
              </p>

              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight">{formatPln(price, locale)}</span>
                <span className="panel-muted text-sm">
                  {interval === "monthly" ? t("perMonth") : t("perYear")} · {t("netNote")}
                </span>
              </p>
              <p className="mt-1 h-4 text-xs font-medium text-[var(--p-accent-text)]">
                {interval === "yearly" ? t("saveMonths", { months: yearlySavingMonths(plan) }) : ""}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.featureKeys.map((key) => (
                  <li key={key} className="flex gap-2.5 text-sm">
                    <PanelIcon name="check" size={16} className="mt-0.5 shrink-0 text-[var(--p-accent-text)]" />
                    <span>{t(FEATURE_KEY[key] ?? key)}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <span className="panel-btn-ghost mt-6 px-5 py-2.5 text-sm">{t("currentPlan")}</span>
              ) : (
                <Link
                  href={href}
                  className={`${featured ? "panel-btn" : "panel-btn-ghost"} mt-6 px-5 py-2.5 text-sm`}
                >
                  {t("choose")}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <p className="panel-muted mt-6 text-center text-sm">{t("trialNote")}</p>
    </div>
  );
}

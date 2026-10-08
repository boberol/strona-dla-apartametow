import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PREPAID_REMINDER_DAYS, accessState, type OrgLike } from "@/lib/subscription";

/** Shows where the subscription stands, and what to do about it. */
export async function TrialBanner({ org, locale }: { org: OrgLike; locale: string }) {
  const t = await getTranslations("billing");
  const state = accessState(org);

  if (state.kind === "active") return null;
  // A prepaid year only needs a word when it is about to run out.
  if (state.kind === "prepaid" && state.daysLeft > PREPAID_REMINDER_DAYS) return null;

  const urgent = state.kind !== "trialing";

  const message =
    state.kind === "trialing"
      ? t("trialDaysLeft", { days: state.daysLeft })
      : state.kind === "prepaid"
        ? t("prepaidDaysLeft", { days: state.daysLeft })
        : state.kind === "prepaid_expired"
          ? t("prepaidExpired")
          : state.kind === "past_due"
        ? t("pastDue")
        : state.kind === "canceled"
          ? t("canceled")
          : t("trialExpired");

  return (
    <div
      className={`mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${
        urgent
          ? "bg-[var(--p-warn-soft)] text-[var(--p-warn-text)]"
          : "bg-[var(--p-accent-soft)] text-[var(--p-text)]"
      }`}
    >
      <span className="font-medium">{message}</span>
      <Link
        href={`/${locale}/dashboard/billing`}
        className="font-semibold text-[var(--p-accent-text)] underline-offset-2 hover:underline"
      >
        {t("seePlans")} →
      </Link>
    </div>
  );
}

import { getFormatter, getTranslations } from "next-intl/server";
import { accessState, type OrgLike } from "@/lib/subscription";

/** One account's subscription state as a labelled chip (never colour alone). */
export async function StatusChip({ org }: { org: OrgLike }) {
  const t = await getTranslations("billing");
  const format = await getFormatter();
  const state = accessState(org);

  const [tone, label] =
    state.kind === "trialing"
      ? ["", t("trialShort", { days: state.daysLeft })]
      : state.kind === "active"
        ? ["accent", t("statusActive")]
        : state.kind === "prepaid"
          ? ["accent", t("paidUntil", { date: format.dateTime(org.currentPeriodEnd!, { dateStyle: "medium" }) })]
          : state.kind === "past_due"
            ? ["warn", t("statusPastDue")]
            : state.kind === "prepaid_expired"
              ? ["warn", t("statusPrepaidExpired")]
              : state.kind === "canceled"
                ? ["warn", t("statusCanceled")]
                : ["warn", t("statusExpired")];

  return (
    <span className="panel-chip" data-tone={tone || undefined}>
      {label}
    </span>
  );
}

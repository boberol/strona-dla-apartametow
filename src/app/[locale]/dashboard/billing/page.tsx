import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/PanelShell";
import { PricingTable } from "@/components/marketing/PricingTable";
import { PanelIcon } from "@/components/panel/icons";
import { currentOrg } from "@/lib/guard";
import { db } from "@/lib/db";
import { hasLiveSubscription, stripeEnabled } from "@/lib/billing";
import { PREPAID_REMINDER_DAYS, accessState, coveredUntil } from "@/lib/subscription";
import {
  PLANS,
  formatPln,
  isBillingInterval,
  isPlanId,
  planPrice,
  type PlanId,
} from "@/lib/plans";
import { openPortal, payOnce, subscribe } from "./actions";

const PLAN_NAME_KEY: Record<PlanId, string> = {
  one: "planOneName",
  complex: "planComplexName",
  pro: "planProName",
};

const METHOD_LABEL: Record<string, string> = {
  card: "methodCard",
  blik: "BLIK",
  p24: "Przelewy24",
  simulated: "methodSimulated",
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("billing"))("title") };
}

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    plan?: string;
    interval?: string;
    simulated?: string;
    subscribed?: string;
    paid?: string;
    canceled?: string;
    error?: string;
  }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const session = await currentOrg();
  if (!session) redirect(`/${locale}/login`);

  const t = await getTranslations("billing");
  const format = await getFormatter();
  const { org } = session;
  const state = accessState(org);
  const live = hasLiveSubscription(org);
  const date = (value: Date | null) => (value ? format.dateTime(value, { dateStyle: "medium" }) : "—");

  const payments = await db.payment.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  // Arriving from the pricing table pre-selects a plan; the owner still has to
  // confirm, because a payment must never be started by following a link.
  const pending =
    isPlanId(query.plan) && isBillingInterval(query.interval)
      ? { plan: query.plan, interval: query.interval }
      : null;

  const planName = org.plan && isPlanId(org.plan) ? t(PLAN_NAME_KEY[org.plan]) : t("trialBadge");
  const covered = coveredUntil(org);

  const status: { tone: "accent" | "warn"; label: string; detail: string | null } =
    state.kind === "trialing"
      ? { tone: "accent", label: t("daysLeft", { days: state.daysLeft }), detail: t("freeUntil", { date: date(org.trialEndsAt) }) }
      : state.kind === "active"
        ? { tone: "accent", label: t("statusActive"), detail: org.currentPeriodEnd ? t("renewsOn", { date: date(org.currentPeriodEnd) }) : null }
        : state.kind === "prepaid"
          ? {
              tone: state.daysLeft <= PREPAID_REMINDER_DAYS ? "warn" : "accent",
              label: t("paidUntil", { date: date(org.currentPeriodEnd) }),
              detail: state.daysLeft <= PREPAID_REMINDER_DAYS ? t("prepaidEndingSoon") : t("prepaidDetail"),
            }
          : state.kind === "prepaid_expired"
            ? { tone: "warn", label: t("statusPrepaidExpired"), detail: t("prepaidExpired") }
            : state.kind === "past_due"
              ? { tone: "warn", label: t("statusPastDue"), detail: t("pastDue") }
              : state.kind === "canceled"
                ? { tone: "warn", label: t("statusCanceled"), detail: t("canceled") }
                : { tone: "warn", label: t("statusExpired"), detail: t("trialExpired") };

  const notice =
    query.paid
      ? { tone: "accent", text: t("paidNotice") }
      : query.subscribed || query.simulated
        ? { tone: "accent", text: t("subscribed") }
        : query.canceled
          ? { tone: "neutral", text: t("checkoutCanceled") }
          : query.error === "portal"
            ? { tone: "warn", text: t("manageUnavailable") }
            : query.error === "has-subscription"
              ? { tone: "warn", text: t("hasSubscription") }
              : null;

  return (
    <PanelShell locale={locale} active="billing">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      {notice ? (
        <div
          role="status"
          className={`mt-6 rounded-xl px-4 py-3 text-sm ${
            notice.tone === "accent"
              ? "bg-[var(--p-accent-soft)]"
              : notice.tone === "warn"
                ? "bg-[var(--p-warn-soft)] text-[var(--p-warn-text)]"
                : "bg-[var(--p-surface-2)]"
          }`}
        >
          <p className="font-medium">{notice.text}</p>
          {query.simulated ? <p className="panel-muted mt-1">{t("simulatedBody")}</p> : null}
        </div>
      ) : null}

      {/* Where the subscription stands. */}
      <div className="panel-surface mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="panel-muted text-sm">{t("currentPlan")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold">{planName}</p>
            <span className="panel-chip" data-tone={status.tone}>
              {status.label}
            </span>
          </div>
          {status.detail ? <p className="panel-muted mt-1 text-sm">{status.detail}</p> : null}
        </div>

        {org.stripeCustomerId && stripeEnabled() ? (
          <form action={openPortal}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="panel-btn-ghost px-4 py-2 text-sm">
              {t("manage")}
            </button>
          </form>
        ) : null}
      </div>

      {pending ? (
        <div id="confirm" className="panel-surface mt-4 border-[var(--p-accent)] p-5 ring-1 ring-[var(--p-accent)]">
          <p className="panel-muted text-sm">{t("confirmTitle")}</p>
          <p className="mt-1 text-lg font-semibold">
            {t(PLAN_NAME_KEY[pending.plan])} ·{" "}
            {formatPln(planPrice(PLANS[pending.plan], pending.interval), locale)}{" "}
            <span className="panel-muted text-sm font-normal">
              {pending.interval === "monthly" ? t("perMonth") : t("perYear")} · {t("netNote")}
            </span>
          </p>
          {covered ? (
            <p className="panel-muted mt-1 text-sm">{t("nothingChargedUntil", { date: date(covered) })}</p>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <form action={subscribe} className="flex flex-col rounded-xl border border-[var(--p-border)] p-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="plan" value={pending.plan} />
              <input type="hidden" name="interval" value={pending.interval} />
              <p className="font-medium">{t("optionSubscribe")}</p>
              <p className="panel-muted mt-1 flex-1 text-sm">
                {pending.interval === "monthly" ? t("optionSubscribeMonthly") : t("optionSubscribeYearly")}
              </p>
              <button type="submit" className="panel-btn mt-4 px-4 py-2 text-sm">
                {t("subscribeCard")}
              </button>
            </form>

            {pending.interval === "yearly" && !live ? (
              <form action={payOnce} className="flex flex-col rounded-xl border border-[var(--p-border)] p-4">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="plan" value={pending.plan} />
                <p className="font-medium">{t("optionPayOnce")}</p>
                <p className="panel-muted mt-1 flex-1 text-sm">{t("optionPayOnceBody")}</p>
                <button type="submit" className="panel-btn-ghost mt-4 px-4 py-2 text-sm">
                  {t("payOnceButton")}
                </button>
              </form>
            ) : pending.interval === "monthly" && !live ? (
              <div className="flex flex-col justify-center rounded-xl bg-[var(--p-surface-2)] p-4 text-sm">
                <p className="panel-muted">{t("blikHint")}</p>
                <Link
                  href={`/${locale}/dashboard/billing?plan=${pending.plan}&interval=yearly#confirm`}
                  className="panel-link mt-2 font-medium"
                >
                  {t("switchToYearly")}
                </Link>
              </div>
            ) : null}
          </div>

          <Link href={`/${locale}/dashboard`} className="panel-muted mt-4 inline-block text-sm hover:text-[var(--p-text)]">
            {t("notNow")}
          </Link>
        </div>
      ) : null}

      <h2 className="mb-2 mt-14 text-lg font-semibold">{t("allPlans")}</h2>
      <p className="panel-muted mb-6 text-sm">{t("paymentMethods")}</p>
      <PricingTable locale={locale} signedIn currentPlan={org.plan} />

      {payments.length > 0 ? (
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">{t("history")}</h2>
          <div className="panel-surface overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="panel-muted border-b border-[var(--p-border)] text-xs">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t("historyDate")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("historyItem")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("historyMethod")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("historyAmount")}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--p-border)]">
                {payments.map((payment) => {
                  const name = isPlanId(payment.plan) ? t(PLAN_NAME_KEY[payment.plan]) : payment.plan;
                  const methodKey = payment.method ? METHOD_LABEL[payment.method] : null;
                  return (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap px-4 py-3">{date(payment.createdAt)}</td>
                      <td className="px-4 py-3">
                        {name} ·{" "}
                        {payment.kind === "prepaid"
                          ? t("itemPrepaid")
                          : payment.interval === "yearly"
                            ? t("itemYearly")
                            : t("itemMonthly")}
                      </td>
                      <td className="panel-muted px-4 py-3">
                        {methodKey ? (methodKey.startsWith("method") ? t(methodKey) : methodKey) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                        {formatPln(payment.amount, locale)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {payment.receiptUrl ? (
                          <a
                            href={payment.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="panel-link inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            {t("receipt")}
                            <PanelIcon name="external" size={13} />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!stripeEnabled() ? (
        <p className="panel-muted mx-auto mt-10 max-w-xl text-center text-xs leading-relaxed">
          <span className="font-semibold">{t("simulatedTitle")}.</span> {t("simulatedNote")}
        </p>
      ) : null}
    </PanelShell>
  );
}

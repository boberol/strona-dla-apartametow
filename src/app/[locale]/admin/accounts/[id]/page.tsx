import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/PanelShell";
import { StatusChip } from "@/components/admin/StatusChip";
import { PanelIcon } from "@/components/panel/icons";
import { currentAdmin } from "@/lib/guard";
import { db } from "@/lib/db";
import { hasLiveSubscription } from "@/lib/billing";
import { PLAN_IDS, formatPln, isPlanId, type PlanId } from "@/lib/plans";
import { endAccess, extendTrial, grantFreeYear, sendPasswordReset, setAdmin } from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin"))("accountsTitle"), robots: { index: false } };
}

const PLAN_NAME_KEY: Record<PlanId, string> = {
  one: "planOneName",
  complex: "planComplexName",
  pro: "planProName",
};

const DONE_KEY: Record<string, string> = {
  trial: "doneTrial",
  year: "doneYear",
  ended: "doneEnded",
  reset: "doneReset",
  "admin-on": "doneAdminOn",
  "admin-off": "doneAdminOff",
};

const ERROR_KEY: Record<string, string> = {
  stripe: "errorStripe",
  self: "errorSelf",
  plan: "errorPlan",
};

export default async function AdminAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { locale, id } = await params;
  const { done, error } = await searchParams;
  setRequestLocale(locale);

  const admin = await currentAdmin();
  if (!admin) notFound();

  const org = await db.organization.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: true } },
      properties: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!org) notFound();

  const t = await getTranslations("admin");
  const tb = await getTranslations("billing");
  const format = await getFormatter();
  const date = (value: Date | null) => (value ? format.dateTime(value, { dateStyle: "medium" }) : "—");
  const live = hasLiveSubscription(org);

  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="orgId" value={org.id} />
    </>
  );

  const fact = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="panel-muted text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );

  return (
    <PanelShell locale={locale} active="admin" wide>
      <Link
        href={`/${locale}/admin/accounts`}
        className="panel-muted inline-flex items-center gap-1.5 text-sm hover:text-[var(--p-text)]"
      >
        <PanelIcon name="arrowLeft" size={15} />
        {t("backToAccounts")}
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
        <StatusChip org={org} />
      </div>

      {done && DONE_KEY[done] ? (
        <p role="status" className="mt-6 rounded-xl bg-[var(--p-accent-soft)] px-4 py-3 text-sm font-medium">
          {t(DONE_KEY[done])}
        </p>
      ) : null}
      {error && ERROR_KEY[error] ? (
        <p role="alert" className="mt-6 rounded-xl bg-[var(--p-warn-soft)] px-4 py-3 text-sm text-[var(--p-warn-text)]">
          {t(ERROR_KEY[error])}
        </p>
      ) : null}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section className="panel-surface p-5">
            <h2 className="font-semibold">{t("subscription")}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {fact(t("colPlan"), isPlanId(org.plan) ? tb(PLAN_NAME_KEY[org.plan]) : "—")}
              {fact(t("interval"), org.billingInterval ? tb(org.billingInterval) : "—")}
              {fact(t("trialEnds"), date(org.trialEndsAt))}
              {fact(t("periodEnds"), date(org.currentPeriodEnd))}
              {fact(t("colCreated"), date(org.createdAt))}
              {fact("Stripe", org.stripeCustomerId ? <code className="text-xs">{org.stripeCustomerId}</code> : "—")}
            </dl>
          </section>

          <section className="panel-surface p-5">
            <h2 className="font-semibold">{t("people")}</h2>
            <ul className="mt-3 divide-y divide-[var(--p-border)]">
              {org.memberships.map(({ user, role }) => (
                <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {user.email}
                      {user.isAdmin ? (
                        <span className="panel-chip" data-tone="accent">
                          <PanelIcon name="shield" size={11} />
                          {t("adminBadge")}
                        </span>
                      ) : null}
                    </p>
                    <p className="panel-muted text-xs">
                      {user.name ?? "—"} · {role} · {user.locale.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={sendPasswordReset}>
                      {hidden}
                      <input type="hidden" name="userId" value={user.id} />
                      <button type="submit" className="panel-btn-ghost px-3 py-1.5 text-xs">
                        <PanelIcon name="mail" size={13} />
                        {t("sendReset")}
                      </button>
                    </form>
                    {user.id !== admin.id ? (
                      <form action={setAdmin}>
                        {hidden}
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="admin" value={user.isAdmin ? "0" : "1"} />
                        <button type="submit" className="panel-btn-ghost px-3 py-1.5 text-xs">
                          <PanelIcon name="shield" size={13} />
                          {user.isAdmin ? t("removeAdmin") : t("makeAdmin")}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel-surface p-5">
            <h2 className="font-semibold">
              {t("apartments")} <span className="panel-muted font-normal">({org.properties.length})</span>
            </h2>
            {org.properties.length === 0 ? (
              <p className="panel-muted mt-3 text-sm">{t("noApartments")}</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--p-border)]">
                {org.properties.map((property) => (
                  <li key={property.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{property.name}</p>
                      <p className="panel-muted text-xs">
                        /s/{property.slug} · /q/{property.shortCode} ·{" "}
                        {property.publishedAt ? t("publishedOn", { date: date(property.publishedAt) }) : t("notPublished")}
                      </p>
                    </div>
                    <a
                      href={`/s/${property.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="panel-link inline-flex items-center gap-1 text-sm"
                    >
                      {t("openGuestSite")}
                      <PanelIcon name="external" size={13} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel-surface p-5">
            <h2 className="font-semibold">{tb("history")}</h2>
            {org.payments.length === 0 ? (
              <p className="panel-muted mt-3 text-sm">{t("noPayments")}</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--p-border)]">
                {org.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>
                      {date(payment.createdAt)} ·{" "}
                      {payment.kind === "prepaid" ? tb("itemPrepaid") : payment.interval === "yearly" ? tb("itemYearly") : tb("itemMonthly")}
                      <span className="panel-muted"> · {payment.method ?? "—"}</span>
                    </span>
                    <span className="font-medium tabular-nums">{formatPln(payment.amount, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Support actions */}
        <aside className="panel-surface space-y-5 p-5">
          <h2 className="font-semibold">{t("actions")}</h2>
          {live ? <p className="rounded-lg bg-[var(--p-warn-soft)] px-3 py-2 text-xs text-[var(--p-warn-text)]">{t("errorStripe")}</p> : null}

          <form action={extendTrial} className="space-y-2">
            {hidden}
            <p className="panel-muted text-sm">{t("extendTrialBody")}</p>
            <button type="submit" disabled={live} className="panel-btn-ghost w-full px-3 py-2 text-sm">
              {t("extendTrial")}
            </button>
          </form>

          <form action={grantFreeYear} className="space-y-2 border-t border-[var(--p-border)] pt-5">
            {hidden}
            <p className="panel-muted text-sm">{t("freeYearBody")}</p>
            <select name="plan" defaultValue={isPlanId(org.plan) ? org.plan : "one"} className="panel-input" aria-label={t("colPlan")}>
              {PLAN_IDS.map((plan) => (
                <option key={plan} value={plan}>
                  {tb(PLAN_NAME_KEY[plan])}
                </option>
              ))}
            </select>
            <button type="submit" disabled={live} className="panel-btn-ghost w-full px-3 py-2 text-sm">
              {t("freeYear")}
            </button>
          </form>

          <form action={endAccess} className="space-y-2 border-t border-[var(--p-border)] pt-5">
            {hidden}
            <p className="panel-muted text-sm">{t("endAccessBody")}</p>
            <button type="submit" disabled={live} className="w-full rounded-[10px] px-3 py-2 text-sm font-medium text-[var(--p-danger-text)] ring-1 ring-[var(--p-danger-text)]/40 transition hover:bg-[var(--p-danger-soft)] disabled:opacity-40">
              {t("endAccess")}
            </button>
          </form>
        </aside>
      </div>
    </PanelShell>
  );
}

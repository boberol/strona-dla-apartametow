import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/PanelShell";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { StatusChip } from "@/components/admin/StatusChip";
import { currentAdmin } from "@/lib/guard";
import { db } from "@/lib/db";
import { estimatedMonthlyRevenue, summarizeAccounts } from "@/lib/admin-stats";
import { formatPln } from "@/lib/plans";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin"))("overviewTitle"), robots: { index: false } };
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel-surface p-4">
      <p className="panel-muted text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="panel-muted mt-0.5 text-xs">{hint}</p> : null}
    </div>
  );
}

export default async function AdminOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Anyone who is not an admin gets the same 404 as a page that does not exist.
  if (!(await currentAdmin())) notFound();

  const t = await getTranslations("admin");
  const format = await getFormatter();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [orgs, newThisWeek, properties, published, openReports, recentOrgs, recentPayments] = await Promise.all([
    db.organization.findMany({
      select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true, billingInterval: true },
    }),
    db.organization.count({ where: { createdAt: { gte: weekAgo } } }),
    db.property.count(),
    db.property.count({ where: { publishedAt: { not: null } } }),
    db.issueReport.count({ where: { status: "new" } }),
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { owner: { select: { email: true } } },
    }),
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { org: { select: { id: true, name: true } } },
    }),
  ]);

  const summary = summarizeAccounts(orgs);
  const number = (n: number) => format.number(n);

  return (
    <PanelShell locale={locale} active="admin" wide>
      <AdminTabs locale={locale} active="overview" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t("statAccounts")} value={number(orgs.length)} hint={t("statNewThisWeek", { count: newThisWeek })} />
        <Stat label={t("statPaying")} value={number(summary.paying)} />
        <Stat label={t("statTrialing")} value={number(summary.trialing)} hint={t("statLapsed", { count: summary.lapsed })} />
        <Stat label={t("statRevenue")} value={formatPln(estimatedMonthlyRevenue(orgs), locale)} hint={t("statRevenueHint")} />
        <Stat label={t("statApartments")} value={number(properties)} hint={t("statPublished", { count: published })} />
        <Stat label={t("statReports")} value={number(openReports)} hint={t("statReportsHint")} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">{t("recentSignups")}</h2>
            <Link href={`/${locale}/admin/accounts`} className="panel-link text-sm">
              {t("seeAll")}
            </Link>
          </div>
          <ul className="panel-surface divide-y divide-[var(--p-border)]">
            {recentOrgs.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/${locale}/admin/accounts/${org.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--p-hover)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{org.name}</span>
                    <span className="panel-muted block truncate text-xs">
                      {org.owner.email} · {format.relativeTime(org.createdAt, new Date())}
                    </span>
                  </span>
                  <StatusChip org={org} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">{t("recentPayments")}</h2>
            <Link href={`/${locale}/admin/payments`} className="panel-link text-sm">
              {t("seeAll")}
            </Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="panel-surface panel-muted px-4 py-6 text-center text-sm">{t("noPayments")}</p>
          ) : (
            <ul className="panel-surface divide-y divide-[var(--p-border)]">
              {recentPayments.map((payment) => (
                <li key={payment.id}>
                  <Link
                    href={`/${locale}/admin/accounts/${payment.org.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--p-hover)]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{payment.org.name}</span>
                      <span className="panel-muted block truncate text-xs">
                        {format.dateTime(payment.createdAt, { dateStyle: "medium" })} · {payment.method ?? "—"}
                      </span>
                    </span>
                    <span className="text-sm font-medium tabular-nums">{formatPln(payment.amount, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PanelShell>
  );
}

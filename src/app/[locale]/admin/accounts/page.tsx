import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/PanelShell";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { StatusChip } from "@/components/admin/StatusChip";
import { PanelIcon } from "@/components/panel/icons";
import { currentAdmin } from "@/lib/guard";
import { db } from "@/lib/db";
import { isPlanId, type PlanId } from "@/lib/plans";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin"))("accountsTitle"), robots: { index: false } };
}

const PLAN_NAME_KEY: Record<PlanId, string> = {
  one: "planOneName",
  complex: "planComplexName",
  pro: "planProName",
};

export default async function AdminAccountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  setRequestLocale(locale);
  if (!(await currentAdmin())) notFound();

  const t = await getTranslations("admin");
  const tb = await getTranslations("billing");
  const format = await getFormatter();

  const orgs = await db.organization.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { owner: { email: { contains: q.toLowerCase() } } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      owner: { select: { email: true, isAdmin: true } },
      _count: { select: { properties: true } },
    },
  });

  return (
    <PanelShell locale={locale} active="admin" wide>
      <AdminTabs locale={locale} active="accounts" />

      <form className="mb-4 flex max-w-md items-center gap-2" role="search">
        <div className="relative flex-1">
          <PanelIcon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--p-muted)]" />
          <input
            name="q"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="panel-input !pl-9"
          />
        </div>
        <button type="submit" className="panel-btn-ghost px-4 py-2 text-sm">
          {t("search")}
        </button>
      </form>

      <div className="panel-surface overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="panel-muted border-b border-[var(--p-border)] text-xs">
            <tr>
              <th className="px-4 py-2.5 font-medium">{t("colAccount")}</th>
              <th className="px-4 py-2.5 font-medium">{t("colPlan")}</th>
              <th className="px-4 py-2.5 font-medium">{t("colStatus")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("colApartments")}</th>
              <th className="px-4 py-2.5 font-medium">{t("colCreated")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--p-border)]">
            {orgs.map((org) => (
              <tr key={org.id} className="transition hover:bg-[var(--p-hover)]">
                <td className="px-4 py-3">
                  <Link href={`/${locale}/admin/accounts/${org.id}`} className="block min-w-0">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{org.name}</span>
                      {org.owner.isAdmin ? (
                        <PanelIcon name="shield" size={13} className="shrink-0 text-[var(--p-accent-text)]" />
                      ) : null}
                    </span>
                    <span className="panel-muted block truncate text-xs">{org.owner.email}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">{isPlanId(org.plan) ? tb(PLAN_NAME_KEY[org.plan]) : "—"}</td>
                <td className="px-4 py-3">
                  <StatusChip org={org} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{org._count.properties}</td>
                <td className="panel-muted whitespace-nowrap px-4 py-3">
                  {format.dateTime(org.createdAt, { dateStyle: "medium" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orgs.length === 0 ? <p className="panel-muted px-4 py-8 text-center text-sm">{t("noResults")}</p> : null}
      </div>
    </PanelShell>
  );
}

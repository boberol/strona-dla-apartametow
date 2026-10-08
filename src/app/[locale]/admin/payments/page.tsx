import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/PanelShell";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PanelIcon } from "@/components/panel/icons";
import { currentAdmin } from "@/lib/guard";
import { db } from "@/lib/db";
import { formatPln, isPlanId, type PlanId } from "@/lib/plans";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin"))("paymentsTitle"), robots: { index: false } };
}

const PLAN_NAME_KEY: Record<PlanId, string> = {
  one: "planOneName",
  complex: "planComplexName",
  pro: "planProName",
};

export default async function AdminPaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await currentAdmin())) notFound();

  const t = await getTranslations("admin");
  const tb = await getTranslations("billing");
  const format = await getFormatter();

  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { org: { select: { id: true, name: true } } },
  });
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <PanelShell locale={locale} active="admin" wide>
      <AdminTabs locale={locale} active="payments" />

      {payments.length === 0 ? (
        <p className="panel-surface panel-muted px-4 py-10 text-center text-sm">{t("noPayments")}</p>
      ) : (
        <>
          <p className="panel-muted mb-3 text-sm">
            {t("paymentsTotal", { count: payments.length, total: formatPln(total, locale) })}
          </p>
          <div className="panel-surface overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="panel-muted border-b border-[var(--p-border)] text-xs">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{tb("historyDate")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("colAccount")}</th>
                  <th className="px-4 py-2.5 font-medium">{tb("historyItem")}</th>
                  <th className="px-4 py-2.5 font-medium">{tb("historyMethod")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{tb("historyAmount")}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--p-border)]">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {format.dateTime(payment.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/admin/accounts/${payment.org.id}`} className="font-medium hover:underline">
                        {payment.org.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {isPlanId(payment.plan) ? tb(PLAN_NAME_KEY[payment.plan]) : payment.plan} ·{" "}
                      {payment.kind === "prepaid"
                        ? tb("itemPrepaid")
                        : payment.interval === "yearly"
                          ? tb("itemYearly")
                          : tb("itemMonthly")}
                    </td>
                    <td className="panel-muted px-4 py-3">{payment.method ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                      {formatPln(payment.amount, locale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {payment.receiptUrl ? (
                        <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" className="panel-link inline-flex items-center gap-1">
                          {tb("receipt")}
                          <PanelIcon name="external" size={13} />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PanelShell>
  );
}

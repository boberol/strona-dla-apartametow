import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/PanelShell";
import { TrialBanner } from "@/components/panel/TrialBanner";
import { PanelIcon } from "@/components/panel/icons";
import { currentOrg } from "@/lib/guard";
import { db } from "@/lib/db";
import { canAddProperty, canEdit, maxProperties } from "@/lib/subscription";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("dashboard"))("title") };
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { locale } = await params;
  const { deleted } = await searchParams;
  setRequestLocale(locale);

  const session = await currentOrg();
  if (!session) redirect(`/${locale}/login`);

  const t = await getTranslations("dashboard");
  const tb = await getTranslations("billing");
  const to = await getTranslations("onboarding");

  const properties = await db.property.findMany({
    where: { orgId: session.org.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      publishedAt: true,
      draft: true,
      published: true,
    },
  });

  const reportCounts = await db.issueReport.groupBy({
    by: ["propertyId"],
    where: { status: "new", propertyId: { in: properties.map((p) => p.id) } },
    _count: { _all: true },
  });
  const newReports = new Map(reportCounts.map((row) => [row.propertyId, row._count._all]));

  const limit = maxProperties(session.org);
  const canAdd = canAddProperty(session.org, properties.length);

  const addButton = (
    <Link href={`/${locale}/onboarding/template`} className="panel-btn px-4 py-2 text-sm">
      <PanelIcon name="plus" size={16} />
      {t("addProperty")}
    </Link>
  );

  return (
    <PanelShell locale={locale} active="properties">
      <TrialBanner org={session.org} locale={locale} />

      {deleted ? (
        <p role="status" className="mb-6 rounded-xl bg-[var(--p-surface-2)] px-4 py-3 text-sm">
          {t("deleted")}
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="panel-muted mt-1 text-sm">
            {tb("propertyLimit", { used: properties.length, max: limit })}
          </p>
        </div>

        {canAdd ? (
          properties.length > 0 ? addButton : null
        ) : (
          /* Two different reasons to block a new apartment; say which one. */
          <span className="panel-muted text-sm">
            {canEdit(session.org) ? to("limitReached") : tb("trialExpired")}
          </span>
        )}
      </div>

      {properties.length === 0 ? (
        <div className="panel-surface flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--p-accent-soft)] text-[var(--p-accent-text)]">
            <PanelIcon name="qr" size={22} />
          </span>
          <p className="mt-4 font-medium">{t("noProperties")}</p>
          <p className="panel-muted mt-1 max-w-sm text-sm">{t("noPropertiesBody")}</p>
          {canAdd ? <div className="mt-6">{addButton}</div> : null}
          <Link href={`/${locale}/dashboard/guide`} className="panel-link mt-4 text-sm">
            {t("readGuide")}
          </Link>
        </div>
      ) : (
        <ul className="panel-surface divide-y divide-[var(--p-border)] overflow-hidden">
          {properties.map((property) => {
            const unpublished = property.draft !== property.published;
            const reports = newReports.get(property.id) ?? 0;

            return (
              <li key={property.id} className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{property.name}</p>
                    {!property.publishedAt ? (
                      <span className="panel-chip">{t("neverPublished")}</span>
                    ) : unpublished ? (
                      <span className="panel-chip" data-tone="warn">{t("unpublished")}</span>
                    ) : (
                      <span className="panel-chip" data-tone="accent">{t("live")}</span>
                    )}
                    {reports > 0 ? (
                      <Link
                        href={`/${locale}/dashboard/inbox`}
                        className="panel-chip hover:text-[var(--p-text)]"
                      >
                        <PanelIcon name="inbox" size={12} />
                        {t("newReports", { count: reports })}
                      </Link>
                    ) : null}
                  </div>
                  <a
                    href={`/s/${property.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="panel-muted mt-1 inline-flex items-center gap-1 text-sm hover:text-[var(--p-text)]"
                  >
                    /s/{property.slug}
                    <PanelIcon name="external" size={13} />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/${locale}/dashboard/sites/${property.id}/settings`}
                    title={t("settings")}
                    aria-label={t("settings")}
                    className="panel-icon-btn !h-9 !w-9"
                  >
                    <PanelIcon name="gear" size={17} />
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/sites/${property.id}/qr`}
                    className="panel-btn-ghost px-3.5 py-2 text-sm"
                  >
                    <PanelIcon name="qr" size={16} />
                    {t("qrCode")}
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/sites/${property.id}`}
                    className="panel-btn px-4 py-2 text-sm"
                  >
                    <PanelIcon name="pencil" size={16} />
                    {t("editSite")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PanelShell>
  );
}

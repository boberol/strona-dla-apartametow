import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelIcon } from "@/components/panel/icons";
import { currentOrg } from "@/lib/guard";
import { db } from "@/lib/db";
import { parsePhotoUrls, type IssueStatus } from "@/lib/issues";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/site/schema";
import { setReportStatus } from "./actions";

/* Guest issue reports for every apartment in the organisation. */

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("inbox"))("title") };
}

export default async function InboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { locale } = await params;
  const { show } = await searchParams;
  setRequestLocale(locale);

  const session = await currentOrg();
  if (!session) redirect(`/${locale}/login`);

  const t = await getTranslations("inbox");
  const format = await getFormatter();
  const view: IssueStatus = show === "resolved" ? "resolved" : "new";

  const scope = { property: { orgId: session.org.id } };
  const [reports, openCount] = await Promise.all([
    db.issueReport.findMany({
      where: { ...scope, status: view },
      orderBy: { createdAt: view === "new" ? "asc" : "desc" },
      take: 100,
      include: { property: { select: { name: true } } },
    }),
    db.issueReport.count({ where: { ...scope, status: "new" } }),
  ]);

  const now = new Date();
  const tab = (key: IssueStatus, label: string) => (
    <Link
      href={key === "new" ? `/${locale}/dashboard/inbox` : `/${locale}/dashboard/inbox?show=resolved`}
      aria-current={view === key ? "page" : undefined}
      className="!px-4 !py-1.5"
    >
      {label}
    </Link>
  );

  return (
    <PanelShell locale={locale} active="inbox">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="panel-muted mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <nav className="panel-segment">
          {tab("new", t("open", { count: openCount }))}
          {tab("resolved", t("resolved"))}
        </nav>
      </div>

      {reports.length === 0 ? (
        <div className="panel-surface flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--p-accent-soft)] text-[var(--p-accent-text)]">
            <PanelIcon name={view === "new" ? "check" : "inbox"} size={22} />
          </span>
          <p className="mt-4 font-medium">{view === "new" ? t("emptyOpen") : t("emptyResolved")}</p>
          {view === "new" ? <p className="panel-muted mt-1 max-w-sm text-sm">{t("emptyOpenBody")}</p> : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => {
            const photos = parsePhotoUrls(report.photoUrls);
            const guestLocale = (LOCALES as readonly string[]).includes(report.locale)
              ? (report.locale as Locale)
              : null;

            return (
              <li key={report.id} className="panel-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="panel-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-semibold text-[var(--p-text)]">{report.property.name}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={report.createdAt.toISOString()} title={format.dateTime(report.createdAt, { dateStyle: "medium", timeStyle: "short" })}>
                      {format.relativeTime(report.createdAt, now)}
                    </time>
                    {guestLocale ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{t("guestLanguage", { language: LOCALE_LABELS[guestLocale] })}</span>
                      </>
                    ) : null}
                  </div>

                  <form action={setReportStatus}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="id" value={report.id} />
                    <input type="hidden" name="status" value={view === "new" ? "resolved" : "new"} />
                    <button type="submit" className="panel-btn-ghost px-3 py-1.5 text-sm">
                      <PanelIcon name={view === "new" ? "check" : "undo"} size={15} />
                      {view === "new" ? t("markResolved") : t("reopen")}
                    </button>
                  </form>
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                  {report.description}
                </p>

                {photos.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {photos.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={t("photo")}
                          className="h-20 w-20 rounded-lg border border-[var(--p-border)] object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </PanelShell>
  );
}

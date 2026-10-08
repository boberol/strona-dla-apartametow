import Link from "next/link";
import { getTranslations } from "next-intl/server";

export type AdminTab = "overview" | "accounts" | "payments";

/** The admin area's own second-level navigation. */
export async function AdminTabs({ locale, active }: { locale: string; active: AdminTab }) {
  const t = await getTranslations("admin");
  const tabs: [AdminTab, string][] = [
    ["overview", `/${locale}/admin`],
    ["accounts", `/${locale}/admin/accounts`],
    ["payments", `/${locale}/admin/payments`],
  ];

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-[var(--p-accent-text)]">{t("eyebrow")}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t(`${active}Title`)}</h1>
      </div>
      <nav className="panel-segment">
        {tabs.map(([key, href]) => (
          <Link key={key} href={href} aria-current={key === active ? "page" : undefined} className="!px-4 !py-1.5">
            {t(key)}
          </Link>
        ))}
      </nav>
    </div>
  );
}

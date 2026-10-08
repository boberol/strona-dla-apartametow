import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AccountMenu } from "./AccountMenu";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";

export type PanelSection = "properties" | "inbox" | "guide" | "billing" | "account" | "admin";

/**
 * Chrome shared by every signed-in page except the editor.
 *
 * Reads the session itself (cached per request, so the page's own lookup is
 * not repeated) rather than having every page thread it through.
 */
export async function PanelShell({
  locale,
  active,
  wide = false,
  children,
}: {
  locale: string;
  active: PanelSection;
  /** Tables such as the admin area need more room than forms do. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);

  const nav = await getTranslations("nav");

  // Unread guest reports, so a broken boiler is noticed from any page.
  const newReports = await db.issueReport.count({
    where: { status: "new", property: { orgId: user.orgId } },
  });

  const link = (href: string, label: string, key: PanelSection, badge = 0) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
        active === key
          ? "bg-[var(--p-hover)] font-medium text-[var(--p-text)]"
          : "panel-muted hover:text-[var(--p-text)]"
      }`}
    >
      {label}
      {badge > 0 ? (
        <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--p-accent)] px-1 text-[10px] font-semibold text-[var(--p-on-accent)]">
          {badge}
        </span>
      ) : null}
    </Link>
  );

  const width = wide ? "max-w-6xl" : "max-w-5xl";

  return (
    <div className="flex min-h-svh flex-col">
      <header className="no-print border-b border-[var(--p-border)] bg-[var(--p-surface)]">
        {/* One row on wide screens; on a phone the nav drops to its own
            scrollable row under the logo and the account controls. */}
        <div className={`mx-auto flex ${width} flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2.5`}>
          <div className="order-1">
            <Brand href={`/${locale}/dashboard`} />
          </div>
          <nav className="order-3 -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-0.5 overflow-x-auto sm:order-2 sm:mx-0 sm:w-auto sm:flex-1">
            {link(`/${locale}/dashboard`, nav("dashboard"), "properties")}
            {link(`/${locale}/dashboard/inbox`, nav("inbox"), "inbox", newReports)}
            {link(`/${locale}/dashboard/guide`, nav("guide"), "guide")}
            {link(`/${locale}/dashboard/billing`, nav("billing"), "billing")}
            {user.isAdmin ? link(`/${locale}/admin`, nav("admin"), "admin") : null}
          </nav>

          <div className="order-2 flex items-center gap-1 sm:order-3">
            <ThemeToggle />
            <AccountMenu email={user.email} locale={locale} isAdmin={user.isAdmin} />
          </div>
        </div>
      </header>

      <main className={`mx-auto w-full ${width} flex-1 px-6 py-10`}>{children}</main>
    </div>
  );
}

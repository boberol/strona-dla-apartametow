import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelIcon } from "@/components/panel/icons";
import { accessProperty } from "@/lib/guard";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/urls";
import { changeSlug, deleteProperty, renameProperty } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("siteSettings"))("title") };
}

const ERROR_KEY: Record<string, string> = {
  name: "errorName",
  slug: "errorSlug",
  "slug-taken": "errorSlugTaken",
  confirm: "errorConfirm",
  subscription: "errorSubscription",
};

export default async function SiteSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale, id } = await params;
  const { saved, error } = await searchParams;
  setRequestLocale(locale);

  const result = await accessProperty(id);
  if (!result.ok) {
    if (result.reason === "unauthenticated") redirect(`/${locale}/login`);
    notFound();
  }

  const property = await db.property.findUniqueOrThrow({
    where: { id },
    select: { name: true, slug: true, shortCode: true },
  });

  const t = await getTranslations("siteSettings");
  const nav = await getTranslations("editor");
  const common = await getTranslations("common");
  const guestBase = appUrl("/s/");

  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
    </>
  );

  return (
    <PanelShell locale={locale} active="properties">
      <Link
        href={`/${locale}/dashboard`}
        className="panel-muted inline-flex items-center gap-1.5 text-sm hover:text-[var(--p-text)]"
      >
        <PanelIcon name="arrowLeft" size={15} />
        {nav("backToDashboard")}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        {t("title")} <span className="panel-muted font-normal">· {property.name}</span>
      </h1>

      {saved ? (
        <p role="status" className="mt-6 rounded-xl bg-[var(--p-accent-soft)] px-4 py-3 text-sm font-medium">
          {t("saved")}
        </p>
      ) : null}
      {error && ERROR_KEY[error] ? (
        <p role="alert" className="mt-6 rounded-xl bg-[var(--p-warn-soft)] px-4 py-3 text-sm text-[var(--p-warn-text)]">
          {t(ERROR_KEY[error])}
        </p>
      ) : null}

      <div className="mt-8 max-w-2xl space-y-6">
        <form action={renameProperty} className="panel-surface space-y-3 p-5">
          {hidden}
          <div>
            <label htmlFor="name" className="font-semibold">
              {t("nameTitle")}
            </label>
            <p className="panel-muted mt-0.5 text-sm">{t("nameBody")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              id="name"
              name="name"
              defaultValue={property.name}
              required
              maxLength={80}
              className="panel-input min-w-0 flex-1"
            />
            <button type="submit" className="panel-btn-ghost px-4 py-2 text-sm">
              {common("save")}
            </button>
          </div>
        </form>

        <form action={changeSlug} className="panel-surface space-y-3 p-5">
          {hidden}
          <div>
            <label htmlFor="slug" className="font-semibold">
              {t("slugTitle")}
            </label>
            <p className="panel-muted mt-0.5 text-sm">{t("slugBody")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-[10px] border border-[var(--p-border-strong)] bg-[var(--p-input-bg)] focus-within:border-[var(--p-accent)]">
              <span className="panel-muted hidden shrink-0 pl-3 text-sm sm:inline">{guestBase}</span>
              <input
                id="slug"
                name="slug"
                defaultValue={property.slug}
                required
                minLength={3}
                maxLength={48}
                pattern="[a-z0-9-]+"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none sm:pl-0.5"
              />
            </div>
            <button type="submit" className="panel-btn-ghost px-4 py-2 text-sm">
              {common("save")}
            </button>
          </div>
          <p className="flex items-start gap-2 text-sm text-[var(--p-accent-text)]">
            <PanelIcon name="qr" size={16} className="mt-0.5 shrink-0" />
            {t("slugQrSafe")}
          </p>
        </form>

        <form action={deleteProperty} className="panel-surface space-y-3 border-[var(--p-danger-text)]/40 p-5">
          {hidden}
          <div>
            <p className="font-semibold text-[var(--p-danger-text)]">{t("deleteTitle")}</p>
            <p className="panel-muted mt-0.5 text-sm">{t("deleteBody")}</p>
          </div>
          <label htmlFor="confirm" className="panel-label">
            {t("deleteConfirm", { name: property.name })}
          </label>
          <div className="flex flex-wrap gap-2">
            <input id="confirm" name="confirm" autoComplete="off" required className="panel-input min-w-0 flex-1" />
            <button type="submit" className="panel-btn-danger px-4 py-2 text-sm">
              <PanelIcon name="trash" size={15} />
              {t("deleteButton")}
            </button>
          </div>
        </form>
      </div>
    </PanelShell>
  );
}

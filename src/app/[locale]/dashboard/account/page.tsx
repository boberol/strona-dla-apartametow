import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelIcon } from "@/components/panel/icons";
import { currentOrg } from "@/lib/guard";
import { changeEmail, changePassword, deleteAccount, updateProfile } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("account"))("title") };
}

const ERROR_KEY: Record<string, string> = {
  password: "errorPassword",
  email: "errorEmail",
  "email-taken": "errorEmailTaken",
  "new-password": "errorNewPassword",
  confirm: "errorConfirm",
};

const SAVED_KEY: Record<string, string> = {
  profile: "savedProfile",
  email: "savedEmail",
  password: "savedPassword",
};

function Section({
  title,
  body,
  danger = false,
  children,
}: {
  title: string;
  body?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`panel-surface p-5 ${danger ? "border-[var(--p-danger-text)]/40" : ""}`}>
      <h2 className={`font-semibold ${danger ? "text-[var(--p-danger-text)]" : ""}`}>{title}</h2>
      {body ? <p className="panel-muted mt-0.5 text-sm">{body}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { saved, error } = await searchParams;
  setRequestLocale(locale);

  const session = await currentOrg();
  if (!session) redirect(`/${locale}/login`);

  const t = await getTranslations("account");
  const common = await getTranslations("common");
  const { user, org } = session;

  const field = (id: string, label: string, input: React.ReactNode) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="panel-label">
        {label}
      </label>
      {input}
    </div>
  );

  const localeInput = <input type="hidden" name="locale" value={locale} />;

  return (
    <PanelShell locale={locale} active="account">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      {saved && SAVED_KEY[saved] ? (
        <p role="status" className="mt-6 rounded-xl bg-[var(--p-accent-soft)] px-4 py-3 text-sm font-medium">
          {t(SAVED_KEY[saved])}
        </p>
      ) : null}
      {error && ERROR_KEY[error] ? (
        <p role="alert" className="mt-6 rounded-xl bg-[var(--p-warn-soft)] px-4 py-3 text-sm text-[var(--p-warn-text)]">
          {t(ERROR_KEY[error])}
        </p>
      ) : null}

      <div className="mt-8 max-w-2xl space-y-6">
        <Section title={t("profileTitle")}>
          <form action={updateProfile} className="space-y-4">
            {localeInput}
            {field("name", t("name"), <input id="name" name="name" defaultValue={user.name ?? ""} maxLength={80} autoComplete="name" className="panel-input" />)}
            {field("business", t("business"), <input id="business" name="business" defaultValue={org.name} maxLength={80} autoComplete="organization" className="panel-input" />)}
            <button type="submit" className="panel-btn-ghost px-4 py-2 text-sm">
              {common("save")}
            </button>
          </form>
        </Section>

        <Section title={t("emailTitle")} body={t("emailBody", { email: user.email })}>
          <form action={changeEmail} className="space-y-4">
            {localeInput}
            {field("email", t("newEmail"), <input id="email" name="email" type="email" required autoComplete="email" className="panel-input" />)}
            {field("email-password", t("currentPassword"), <input id="email-password" name="password" type="password" required autoComplete="current-password" className="panel-input" />)}
            <button type="submit" className="panel-btn-ghost px-4 py-2 text-sm">
              <PanelIcon name="mail" size={15} />
              {t("changeEmail")}
            </button>
          </form>
        </Section>

        <Section title={t("passwordTitle")} body={t("passwordBody")}>
          <form action={changePassword} className="space-y-4">
            {localeInput}
            {field("current", t("currentPassword"), <input id="current" name="current" type="password" required autoComplete="current-password" className="panel-input" />)}
            {field("next", t("newPassword"), <input id="next" name="next" type="password" required minLength={8} autoComplete="new-password" className="panel-input" />)}
            <button type="submit" className="panel-btn-ghost px-4 py-2 text-sm">
              <PanelIcon name="lock" size={15} />
              {t("changePassword")}
            </button>
          </form>
        </Section>

        <Section title={t("deleteTitle")} body={t("deleteBody")} danger>
          <form action={deleteAccount} className="space-y-4">
            {localeInput}
            {field("confirm", t("deleteConfirm", { email: user.email }), <input id="confirm" name="confirm" required autoComplete="off" className="panel-input" />)}
            {field("delete-password", t("currentPassword"), <input id="delete-password" name="password" type="password" required autoComplete="current-password" className="panel-input" />)}
            <button type="submit" className="panel-btn-danger px-4 py-2 text-sm">
              <PanelIcon name="trash" size={15} />
              {t("deleteButton")}
            </button>
          </form>
        </Section>
      </div>
    </PanelShell>
  );
}

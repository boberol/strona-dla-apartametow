"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signOutAction } from "@/app/[locale]/(auth)/actions";
import { PanelIcon } from "./icons";

/** Account, admin and sign-out behind one button, so the header stays short. */
export function AccountMenu({
  email,
  locale,
  isAdmin,
}: {
  email: string;
  locale: string;
  isAdmin: boolean;
}) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[var(--p-hover)]";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("account")}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-[var(--p-hover)]"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--p-accent-soft)] text-xs font-semibold uppercase text-[var(--p-accent-text)]">
          {email.charAt(0)}
        </span>
        <PanelIcon name="chevronDown" size={14} className="text-[var(--p-muted)]" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1.5 w-60 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] p-1 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.25)]"
        >
          <p className="panel-muted truncate px-3 pb-2 pt-1.5 text-xs">{email}</p>
          <Link role="menuitem" href={`/${locale}/dashboard/account`} className={item} onClick={() => setOpen(false)}>
            <PanelIcon name="user" size={16} className="text-[var(--p-muted)]" />
            {t("accountSettings")}
          </Link>
          {isAdmin ? (
            <Link role="menuitem" href={`/${locale}/admin`} className={item} onClick={() => setOpen(false)}>
              <PanelIcon name="shield" size={16} className="text-[var(--p-muted)]" />
              {t("admin")}
            </Link>
          ) : null}
          <div className="my-1 h-px bg-[var(--p-border)]" />
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" role="menuitem" className={item}>
              <PanelIcon name="logout" size={16} className="text-[var(--p-muted)]" />
              {t("signOut")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

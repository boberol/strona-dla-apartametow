"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PanelIcon } from "@/components/panel/icons";
import type { L10nString, Locale } from "@/site/schema";

/* Shared controls for the inspector panels. */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="panel-label">{label}</span>
      {children}
      {hint ? <span className="panel-muted block text-xs">{hint}</span> : null}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="panel-input"
    />
  );
}

/**
 * Edits one language of a translatable value -- whichever the editor's content
 * language tab is on -- and flags when that language is still empty.
 */
export function L10nInput({
  label,
  value,
  locale,
  onChange,
  multiline = false,
  rows = 5,
  hint,
}: {
  label: string;
  value: L10nString;
  locale: Locale;
  onChange: (next: L10nString) => void;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}) {
  const t = useTranslations("editor");
  const id = useId();
  const current = value[locale] ?? "";
  const missing = current.trim().length === 0;

  const set = (next: string) => onChange({ ...value, [locale]: next });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="panel-label">
          {label}
        </label>
        {missing ? (
          <span className="panel-chip !py-0 !text-[10px]" data-tone="warn">
            {t("untranslated")} · {locale.toUpperCase()}
          </span>
        ) : null}
      </div>

      {multiline ? (
        <textarea
          id={id}
          value={current}
          rows={rows}
          onChange={(event) => set(event.target.value)}
          className="panel-input resize-y leading-relaxed"
        />
      ) : (
        <input id={id} value={current} onChange={(event) => set(event.target.value)} className="panel-input" />
      )}

      {hint ? <p className="panel-muted text-xs">{hint}</p> : null}
    </div>
  );
}

const HEX = /^#[0-9a-f]{6}$/i;

export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span
        className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--p-border-strong)]"
        style={{ background: HEX.test(value) ? value : "transparent" }}
      >
        <input
          type="color"
          value={HEX.test(value) ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={label}
        />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        spellCheck={false}
        className="w-[5.5rem] rounded-lg border border-transparent bg-transparent px-2 py-1 text-right font-mono text-xs text-[var(--p-muted)] outline-none hover:border-[var(--p-border)] focus:border-[var(--p-accent)] focus:text-[var(--p-text)]"
      />
    </div>
  );
}

export function RangeInput({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1 py-1">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
        <span className="panel-muted font-mono text-xs">
          {value}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--p-accent)]"
      />
    </div>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="panel-input cursor-pointer"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** An on/off switch. A real checkbox underneath, so keyboards and forms just work. */
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-sm">{label}</span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-5 w-9 rounded-full bg-[var(--p-border-strong)] transition peer-checked:bg-[var(--p-accent)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--p-accent)]" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function ImageInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const t = useTranslations("editor");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setFailed(false);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { url: string };
      onChange(data.url);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const picker = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      disabled={busy}
      className="sr-only"
      tabIndex={-1}
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void upload(file);
      }}
    />
  );

  return (
    <div className="space-y-1.5">
      <span className="panel-label">{label}</span>
      {picker}

      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="h-14 w-20 shrink-0 rounded-lg border border-[var(--p-border)] object-cover"
          />
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="panel-btn-ghost px-2.5 py-1 text-xs"
            >
              {busy ? t("uploading") : t("replace")}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-lg px-2.5 py-1 text-xs text-[var(--p-danger-text)] hover:bg-[var(--p-danger-soft)]"
            >
              {t("remove")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--p-border-strong)] px-3 py-3 text-sm text-[var(--p-muted)] transition hover:border-[var(--p-accent)] hover:text-[var(--p-text)] disabled:opacity-60"
        >
          <PanelIcon name={busy ? "download" : "plus"} size={15} />
          {busy ? t("uploading") : t("upload")}
        </button>
      )}

      {failed ? <p className="text-xs text-[var(--p-danger-text)]">{t("uploadFailed")}</p> : null}
    </div>
  );
}

type IconHit = { name: string; body: string; viewBox: string };

function IconGlyph({ icon, size = 20 }: { icon: IconHit; size?: number }) {
  return (
    <svg
      viewBox={icon.viewBox}
      width={size}
      height={size}
      aria-hidden="true"
      // Bodies come from the server's bundled icon sets, never from user input.
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}

/**
 * Shows the chosen icon; the search grid only opens on request, because it is
 * the single largest thing in the inspector and is needed rarely.
 */
export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const t = useTranslations("editor");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<IconHit[]>([]);
  const [current, setCurrent] = useState<IconHit | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/icons?name=${encodeURIComponent(value)}`, { signal: controller.signal })
      .then((response) => response.json() as Promise<{ icon: IconHit | null }>)
      .then((data) => setCurrent(data.icon))
      .catch(() => {
        /* aborted or offline: the name is still shown */
      });
    return () => controller.abort();
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/icons?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { icons: IconHit[] };
        setHits(data.icons);
      } catch {
        /* aborted or offline: keep whatever is on screen */
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  return (
    <div className="space-y-1.5">
      <span className="panel-label">{t("icon")}</span>

      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--p-border)] bg-[var(--p-surface-2)]">
          {current ? <IconGlyph icon={current} /> : null}
        </span>
        <span className="panel-muted min-w-0 flex-1 truncate font-mono text-xs">{value}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="panel-btn-ghost px-3 py-1.5 text-xs"
        >
          {open ? t("done") : t("change")}
        </button>
      </div>

      {open ? (
        <div className="space-y-2 pt-1">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("iconSearch")}
            className="panel-input"
            autoFocus
          />
          <div className="grid max-h-48 grid-cols-7 gap-1 overflow-y-auto rounded-xl border border-[var(--p-border)] p-1.5">
            {hits.map((hit) => (
              <button
                key={hit.name}
                type="button"
                title={hit.name}
                aria-label={hit.name}
                aria-pressed={hit.name === value}
                onClick={() => onChange(hit.name)}
                className={`grid aspect-square place-items-center rounded-lg transition ${
                  hit.name === value
                    ? "bg-[var(--p-accent)] text-[var(--p-on-accent)]"
                    : "hover:bg-[var(--p-hover)]"
                }`}
              >
                <IconGlyph icon={hit} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

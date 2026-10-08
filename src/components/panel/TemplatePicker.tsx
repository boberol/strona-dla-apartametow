"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { TemplateId } from "@/site/templates";

/*
 * Onboarding step one: choose a starting template.
 *
 * The previews are rendered on the server and handed in as nodes, so this
 * client component only owns the selection. That keeps the icon rendering on
 * the server (guests and owners both fetch zero icon requests) while the
 * radio behaviour stays interactive.
 */

export type TemplateChoice = {
  id: TemplateId;
  name: string;
  description: string;
  preview: ReactNode;
};

export function TemplatePicker({
  templates,
  locale,
  action,
  defaultName,
  error,
  plan,
}: {
  templates: TemplateChoice[];
  locale: string;
  action: (formData: FormData) => void;
  defaultName: string;
  error?: string;
  /** Carried from the pricing page through signup, so it is not lost here. */
  plan?: { plan: string; interval: string } | null;
}) {
  const t = useTranslations("onboarding");
  const [selected, setSelected] = useState<TemplateId>(templates[0].id);
  const [name, setName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);

  const active = templates.find((template) => template.id === selected) ?? templates[0];

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="panel-muted mt-2 text-sm leading-relaxed">{t("subtitle")}</p>

        <p className="panel-muted mt-3 flex items-center gap-2 text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t("setupTime")}
        </p>

        <form action={action} onSubmit={() => setSubmitting(true)} className="mt-6 space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="template" value={selected} />
          {plan ? <input type="hidden" name="plan" value={plan.plan} /> : null}
          {plan ? <input type="hidden" name="interval" value={plan.interval} /> : null}

          <fieldset className="space-y-2.5">
            <legend className="sr-only">{t("title")}</legend>
            {templates.map((template) => {
              const isSelected = template.id === selected;
              return (
                <button
                  key={template.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-selected={isSelected}
                  onClick={() => setSelected(template.id)}
                  className="panel-option flex items-start gap-3 p-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{template.name}</span>
                    <span className="panel-muted mt-0.5 block text-sm leading-snug">
                      {template.description}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      isSelected
                        ? "border-transparent bg-[var(--p-accent)] text-[var(--p-on-accent)]"
                        : "border-[var(--p-border-strong)]"
                    }`}
                  >
                    {isSelected ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 13l4 4L19 7"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </fieldset>

          <div className="space-y-1.5 pt-2">
            <label htmlFor="property-name" className="panel-label">
              {t("propertyName")}
            </label>
            <input
              id="property-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="panel-input"
              required
            />
            <p className="panel-muted text-sm">{t("propertyNameHint")}</p>
          </div>

          {error ? (
            <p className="text-sm text-[var(--p-danger-text)]">
              {error === "limit" ? t("limitReached") : t("failed")}
            </p>
          ) : null}

          <button type="submit" disabled={submitting} className="panel-btn w-full px-5 py-2.5 text-sm">
            {submitting ? t("creating") : t("useTemplate")}
          </button>
        </form>
      </div>

      <div className="hidden justify-center lg:flex">
        <div className="panel-phone h-[720px] w-[356px]" aria-label={t("preview")}>
          <div className="h-full w-full overflow-y-auto">{active.preview}</div>
        </div>
      </div>
    </div>
  );
}

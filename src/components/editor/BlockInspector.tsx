"use client";

import { useTranslations } from "next-intl";
import { Field, ImageInput, L10nInput, Select, TextInput, Toggle } from "./fields";
import type { Block, L10nString, Locale } from "@/site/schema";

/*
 * The editor half of the block registry.
 *
 * Each case here pairs with a case in the guest BlockRenderer. Adding a block
 * type means touching its schema, its renderer and its inspector -- kept in
 * three files so the editor's form code never ships in the guest bundle.
 */

type Patch = Record<string, unknown>;

export function BlockInspector({
  block,
  locale,
  onChange,
}: {
  block: Block;
  locale: Locale;
  onChange: (patch: Patch) => void;
}) {
  const t = useTranslations("blocks");

  const l10n = (label: string, value: L10nString, key: string, multiline = false, hint?: string) => (
    <L10nInput
      label={label}
      value={value}
      locale={locale}
      multiline={multiline}
      hint={hint}
      onChange={(next) => onChange({ [key]: next })}
    />
  );

  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-3">
          {l10n(t("heading"), block.text, "text")}
          <Field label={t("headingLevel")}>
            <Select
              value={String(block.level)}
              options={[
                { value: "2", label: "H2" },
                { value: "3", label: "H3" },
              ]}
              onChange={(value) => onChange({ level: Number(value) })}
            />
          </Field>
          <Field label={t("align")}>
            <Select
              value={block.align}
              options={[
                { value: "left", label: t("alignLeft") },
                { value: "center", label: t("alignCenter") },
              ]}
              onChange={(value) => onChange({ align: value })}
            />
          </Field>
        </div>
      );

    case "richText":
      return l10n(t("richText"), block.text, "text", true, t("textHelp"));

    case "image":
      return (
        <div className="space-y-3">
          <ImageInput label={t("image")} value={block.url} onChange={(url) => onChange({ url })} />
          {l10n(t("altText"), block.alt, "alt")}
          <Toggle
            label={t("rounded")}
            checked={block.rounded}
            onChange={(rounded) => onChange({ rounded })}
          />
        </div>
      );

    case "gallery":
      return (
        <div className="space-y-3">
          {block.images.map((image, index) => (
            <div key={index} className="flex items-center gap-3 rounded-xl bg-[var(--p-surface-2)] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="h-12 w-16 rounded object-cover" />
              <button
                type="button"
                className="text-xs font-medium text-[var(--p-danger-text)] hover:underline"
                onClick={() =>
                  onChange({ images: block.images.filter((_, i) => i !== index) })
                }
              >
                {t("removeItem")}
              </button>
            </div>
          ))}
          <ImageInput
            label={t("addItem")}
            value={null}
            onChange={(url) =>
              url ? onChange({ images: [...block.images, { url, alt: {} }] }) : undefined
            }
          />
        </div>
      );

    case "keyValue":
      return (
        <div className="space-y-3">
          {block.items.map((item, index) => {
            const patchItem = (patch: Partial<(typeof block.items)[number]>) =>
              onChange({
                items: block.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
              });

            return (
              <div key={index} className="space-y-3 rounded-xl bg-[var(--p-surface-2)] p-3">
                <L10nInput
                  label={t("itemLabel")}
                  value={item.label}
                  locale={locale}
                  onChange={(label) => patchItem({ label })}
                />
                <Field label={t("itemValue")}>
                  <TextInput value={item.value} onChange={(value) => patchItem({ value })} />
                </Field>
                <Toggle
                  label={t("copyable")}
                  checked={item.copyable}
                  onChange={(copyable) => patchItem({ copyable })}
                />
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--p-danger-text)] hover:underline"
                  onClick={() => onChange({ items: block.items.filter((_, i) => i !== index) })}
                >
                  {t("removeItem")}
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="w-full rounded-xl border border-dashed border-[var(--p-border-strong)] py-2 text-sm text-[var(--p-muted)] transition hover:border-[var(--p-accent)] hover:text-[var(--p-text)]"
            onClick={() =>
              onChange({ items: [...block.items, { label: {}, value: "", copyable: true }] })
            }
          >
            + {t("addItem")}
          </button>
        </div>
      );

    case "button":
      return (
        <div className="space-y-3">
          {l10n(t("buttonLabel"), block.label, "label")}
          <Field label={t("buttonHref")}>
            <TextInput
              value={block.href}
              placeholder="https://"
              onChange={(href) => onChange({ href })}
            />
          </Field>
          <Field label={t("buttonStyle")}>
            <Select
              value={block.style}
              options={[
                { value: "primary", label: t("primary") },
                { value: "secondary", label: t("secondary") },
              ]}
              onChange={(style) => onChange({ style })}
            />
          </Field>
        </div>
      );

    case "map":
      return (
        <div className="space-y-3">
          {l10n(t("address"), block.address, "address", true)}
          <Field label={t("mapQuery")}>
            <TextInput value={block.query} onChange={(query) => onChange({ query })} />
          </Field>
        </div>
      );

    case "video":
      return (
        <Field label={t("videoUrl")}>
          <TextInput
            value={block.url}
            placeholder="https://www.youtube.com/watch?v=..."
            onChange={(url) => onChange({ url })}
          />
        </Field>
      );

    case "faq":
      return (
        <div className="space-y-3">
          {block.items.map((item, index) => {
            const patchItem = (patch: Partial<(typeof block.items)[number]>) =>
              onChange({
                items: block.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
              });

            return (
              <div key={index} className="space-y-3 rounded-xl bg-[var(--p-surface-2)] p-3">
                <L10nInput
                  label={t("question")}
                  value={item.q}
                  locale={locale}
                  onChange={(q) => patchItem({ q })}
                />
                <L10nInput
                  label={t("answer")}
                  value={item.a}
                  locale={locale}
                  multiline
                  rows={3}
                  onChange={(a) => patchItem({ a })}
                />
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--p-danger-text)] hover:underline"
                  onClick={() => onChange({ items: block.items.filter((_, i) => i !== index) })}
                >
                  {t("removeItem")}
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="w-full rounded-xl border border-dashed border-[var(--p-border-strong)] py-2 text-sm text-[var(--p-muted)] transition hover:border-[var(--p-accent)] hover:text-[var(--p-text)]"
            onClick={() => onChange({ items: [...block.items, { q: {}, a: {} }] })}
          >
            + {t("addItem")}
          </button>
        </div>
      );

    case "contact":
      return (
        <div className="space-y-3">
          <Field label={t("phone")}>
            <TextInput
              value={block.phone ?? ""}
              onChange={(phone) => onChange({ phone: phone || null })}
            />
          </Field>
          <Field label={t("whatsapp")}>
            <TextInput
              value={block.whatsapp ?? ""}
              onChange={(whatsapp) => onChange({ whatsapp: whatsapp || null })}
            />
          </Field>
          <Field label={t("email")}>
            <TextInput
              value={block.email ?? ""}
              onChange={(email) => onChange({ email: email || null })}
            />
          </Field>
          {l10n(t("note"), block.note, "note", true, undefined)}
        </div>
      );

    case "divider":
      return <p className="panel-muted text-sm">{t("dividerHelp")}</p>;
  }
}

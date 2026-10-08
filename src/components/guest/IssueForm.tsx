"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Guest-facing damage report. Photos and the description go up in one
 * multipart request, so a failed submit never leaves an orphaned upload.
 */
export function IssueForm({ propertyId, locale }: { propertyId: string; locale: string }) {
  const t = useTranslations("guest");
  const [status, setStatus] = useState<Status>("idle");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [touched, setTouched] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const invalid = description.trim().length === 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (invalid) return;

    setStatus("sending");
    const body = new FormData();
    body.set("propertyId", propertyId);
    body.set("locale", locale);
    body.set("description", description);
    files.forEach((file) => body.append("photos", file));

    try {
      const response = await fetch("/api/issues", { method: "POST", body });
      if (!response.ok) throw new Error(String(response.status));
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  function reset() {
    setDescription("");
    setFiles([]);
    setTouched(false);
    setStatus("idle");
    if (fileInput.current) fileInput.current.value = "";
  }

  if (status === "sent") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-lg font-semibold">{t("issueSent")}</p>
        <p className="opacity-75">{t("issueSentBody")}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full px-5 py-3 text-sm font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          {t("issueAnother")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="opacity-80">{t("issueIntro")}</p>

      <div className="space-y-1">
        <label htmlFor="issue-description" className="text-sm font-medium">
          {t("issueDescription")}
        </label>
        <textarea
          id="issue-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => setTouched(true)}
          rows={5}
          placeholder={t("issuePlaceholder")}
          aria-invalid={touched && invalid}
          aria-describedby={touched && invalid ? "issue-error" : undefined}
          className="w-full rounded-2xl border border-current/20 bg-transparent p-3 outline-none focus:border-current/50"
        />
        {touched && invalid ? (
          <p id="issue-error" className="text-sm text-red-600">
            {t("issueRequired")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="issue-photos"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-current/30 px-4 py-4 text-sm font-medium"
        >
          {t("issuePhoto")}
        </label>
        <input
          ref={fileInput}
          id="issue-photos"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        {files.length > 0 ? (
          <ul className="space-y-1 text-sm opacity-75">
            {files.map((file) => (
              <li key={file.name} className="truncate">
                {file.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {status === "error" ? <p className="text-sm text-red-600">{t("issueError")}</p> : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: "var(--accent)" }}
      >
        {status === "sending" ? t("issueSending") : t("issueSubmit")}
      </button>
    </form>
  );
}

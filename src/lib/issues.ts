/*
 * Guest issue reports, as the owner's inbox sees them.
 *
 * A report is either waiting for the owner ("new") or dealt with
 * ("resolved"). Kept as plain strings in the database, like the other
 * status columns, and narrowed here.
 */

export const ISSUE_STATUSES = ["new", "resolved"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const isIssueStatus = (value: unknown): value is IssueStatus =>
  typeof value === "string" && (ISSUE_STATUSES as readonly string[]).includes(value);

/** photoUrls is JSON text written by /api/issues; never trust it to parse. */
export function parsePhotoUrls(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((url): url is string => typeof url === "string" && url.startsWith("/uploads/"))
      : [];
  } catch {
    return [];
  }
}

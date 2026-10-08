"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentOrg } from "@/lib/guard";
import { setIssueStatus } from "@/lib/inbox";
import { isIssueStatus } from "@/lib/issues";

/**
 * Marks a guest report resolved, or reopens it.
 *
 * Deliberately not gated on the subscription: an expired trial stops site
 * editing, but an owner must always be able to deal with a guest's problem.
 */
export async function setReportStatus(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status");

  const session = await currentOrg();
  if (!session) redirect(`/${locale}/login`);
  if (!id || !isIssueStatus(status)) return;

  await setIssueStatus(session.org.id, id, status);
  revalidatePath(`/${locale}/dashboard`, "layout");
}

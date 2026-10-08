import { getTranslations } from "next-intl/server";
import { db } from "./db";
import { sendEmail } from "./email";
import type { IssueStatus } from "./issues";
import { appUrl } from "./urls";
import { LOCALES, type Locale } from "@/site/schema";

/**
 * Changes a guest report's status, scoped to one organisation.
 *
 * Another organisation's report id matches nothing and changes nothing,
 * exactly like an id that does not exist. Returns whether a row changed.
 */
export async function setIssueStatus(orgId: string, id: string, status: IssueStatus): Promise<boolean> {
  const { count } = await db.issueReport.updateMany({
    where: { id, property: { orgId } },
    data: { status },
  });
  return count > 0;
}

/**
 * Tells the apartment's owners a guest reported something, each in the
 * language they use the panel in. Never throws: the guest's report is already
 * saved, and a mail problem must not turn that into an error for them.
 */
export async function notifyNewReport(propertyId: string, description: string): Promise<void> {
  try {
    const property = await db.property.findUnique({
      where: { id: propertyId },
      select: {
        name: true,
        org: { select: { memberships: { select: { user: { select: { email: true, locale: true } } } } } },
      },
    });
    if (!property) return;

    const excerpt = description.length > 400 ? `${description.slice(0, 400)}…` : description;
    for (const { user } of property.org.memberships) {
      const locale = (LOCALES as readonly string[]).includes(user.locale) ? (user.locale as Locale) : "en";
      const t = await getTranslations({ locale, namespace: "email" });
      await sendEmail({
        to: user.email,
        subject: t("reportSubject", { property: property.name }),
        text: t("reportBody", { property: property.name, description: excerpt, url: appUrl(`/${locale}/dashboard/inbox`) }),
      });
    }
  } catch (error) {
    console.error("[inbox] could not send the report notification", error);
  }
}

import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Editor } from "@/components/editor/Editor";
import { accessProperty } from "@/lib/guard";
import { loadDraft } from "@/lib/site-store";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("dashboard"))("editSite") };
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const result = await accessProperty(id);
  if (!result.ok) {
    if (result.reason === "unauthenticated") redirect(`/${locale}/login`);
    notFound();
  }

  const property = await loadDraft(id);
  if (!property) notFound();

  return (
    <Editor
      propertyId={property.id}
      propertyName={property.name}
      slug={property.slug}
      uiLocale={locale}
      initialDoc={property.doc}
      initialHasUnpublishedChanges={property.hasUnpublishedChanges}
      readOnly={!result.access.canEdit}
    />
  );
}

import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelIcon } from "@/components/panel/icons";
import { getSessionUser } from "@/lib/auth";
import { GUIDE, type GuideBlock } from "@/content/guide";
import { LOCALES, type Locale } from "@/site/schema";

const asLocale = (value: string): Locale =>
  (LOCALES as readonly string[]).includes(value) ? (value as Locale) : "en";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: GUIDE[asLocale((await params).locale)].title };
}

/** `code` and **bold** inside guide text; everything else is plain text. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded-md bg-[var(--p-surface-2)] px-1.5 py-0.5 font-mono text-[0.85em]">
            {part}
          </code>
        ) : (
          part.split("**").map((piece, j) =>
            j % 2 === 1 ? (
              <strong key={`${i}-${j}`} className="font-semibold text-[var(--p-text)]">
                {piece}
              </strong>
            ) : (
              piece
            ),
          )
        ),
      )}
    </>
  );
}

function Block({ block, tipLabel }: { block: GuideBlock; tipLabel: string }) {
  if ("p" in block) {
    return (
      <p className="panel-muted leading-relaxed">
        <Inline text={block.p} />
      </p>
    );
  }
  if ("tip" in block) {
    return (
      <p className="rounded-xl bg-[var(--p-accent-soft)] px-4 py-3 text-sm leading-relaxed">
        <span className="font-semibold text-[var(--p-accent-text)]">{tipLabel}. </span>
        <Inline text={block.tip} />
      </p>
    );
  }
  if ("steps" in block) {
    return (
      <ol className="space-y-2.5">
        {block.steps.map((step, index) => (
          <li key={index} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--p-surface-2)] text-xs font-semibold">
              {index + 1}
            </span>
            <span className="panel-muted leading-relaxed">
              <Inline text={step} />
            </span>
          </li>
        ))}
      </ol>
    );
  }
  if ("check" in block) {
    return (
      <ul className="space-y-2">
        {block.check.map((item, index) => (
          <li key={index} className="flex gap-3">
            <PanelIcon name="check" size={18} className="mt-0.5 shrink-0 text-[var(--p-accent-text)]" />
            <span className="leading-relaxed">
              <Inline text={item} />
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="space-y-2">
      {block.list.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--p-border-strong)]" />
          <span className="panel-muted leading-relaxed">
            <Inline text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getSessionUser())) redirect(`/${locale}/login`);

  const guide = GUIDE[asLocale(locale)];
  const nav = await getTranslations("guide");

  return (
    <PanelShell locale={locale} active="guide">
      <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-8" aria-label={guide.contents}>
            <p className="panel-muted mb-3 text-xs font-medium">{guide.contents}</p>
            <ol className="space-y-0.5 border-l border-[var(--p-border)]">
              {guide.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="panel-muted -ml-px block border-l border-transparent py-1 pl-3 text-sm transition hover:border-[var(--p-accent)] hover:text-[var(--p-text)]"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight">{guide.title}</h1>
          <p className="panel-muted mt-3 text-lg leading-relaxed">{guide.intro}</p>

          <div className="mt-12 space-y-14">
            {guide.sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-8">
                <p className="text-sm font-semibold text-[var(--p-accent-text)]">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">{section.title}</h2>
                <div className="mt-4 space-y-4 text-[15px]">
                  {section.blocks.map((block, blockIndex) => (
                    <Block key={blockIndex} block={block} tipLabel={guide.tip} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="panel-muted mt-16 border-t border-[var(--p-border)] pt-6 text-sm">{nav("footer")}</p>
        </article>
      </div>
    </PanelShell>
  );
}

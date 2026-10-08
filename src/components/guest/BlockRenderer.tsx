import Image from "next/image";
import { CopyValue } from "./CopyValue";
import { Icon } from "./Icon";
import { RichText, safeHref } from "@/site/markdown";
import { pick, type Block, type Locale } from "@/site/schema";
import { getTranslations } from "next-intl/server";

/*
 * The guest-side half of the block registry.
 *
 * Every block type renders here and nowhere else: the editor's live preview is
 * an iframe of this same guest app, so there is exactly one renderer and the
 * preview can never drift from what a guest actually sees.
 */

type Ctx = { locale: Locale; fallback: Locale };

function youTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match) return match[1];
  }
  return null;
}

async function BlockBody({ block, ctx }: { block: Block; ctx: Ctx }) {
  const t = await getTranslations({ locale: ctx.locale, namespace: "guest" });
  const text = (value: Parameters<typeof pick>[0]) => pick(value, ctx.locale, ctx.fallback);

  switch (block.type) {
    case "heading": {
      const content = text(block.text);
      if (!content) return null;
      const className = `font-semibold ${block.level === 2 ? "text-xl" : "text-lg"} ${
        block.align === "center" ? "text-center" : ""
      }`;
      return block.level === 2 ? (
        <h2 className={className}>{content}</h2>
      ) : (
        <h3 className={className}>{content}</h3>
      );
    }

    case "richText":
      return <RichText text={text(block.text)} />;

    case "image": {
      if (!block.url) return null;
      return (
        <figure className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 3" }}>
          <Image
            src={block.url}
            alt={text(block.alt)}
            fill
            sizes="(max-width: 640px) 100vw, 560px"
            className={`object-cover ${block.rounded ? "rounded-2xl" : ""}`}
          />
        </figure>
      );
    }

    case "gallery": {
      if (block.images.length === 0) return null;
      return (
        <div className="grid grid-cols-2 gap-2">
          {block.images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              className="relative overflow-hidden rounded-xl"
              style={{ aspectRatio: "1 / 1" }}
            >
              <Image
                src={image.url}
                alt={text(image.alt)}
                fill
                sizes="(max-width: 640px) 50vw, 280px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      );
    }

    case "keyValue": {
      const items = block.items.filter((item) => item.value.trim().length > 0);
      if (items.length === 0) return null;
      return (
        <dl className="divide-y divide-current/10 rounded-2xl border border-current/10">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <dt className="text-xs uppercase tracking-wide opacity-60">
                  {text(item.label)}
                </dt>
                <dd className="truncate font-semibold">{item.value}</dd>
              </div>
              {item.copyable ? <CopyValue value={item.value} /> : null}
            </div>
          ))}
        </dl>
      );
    }

    case "button": {
      const href = safeHref(block.href);
      const label = text(block.label);
      if (!href || !label) return null;
      const primary = block.style === "primary";
      return (
        <a
          href={href}
          target={href.startsWith("/") ? undefined : "_blank"}
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
            primary ? "text-white" : "border-2"
          }`}
          style={
            primary
              ? { background: "var(--accent)" }
              : { borderColor: "var(--accent)", color: "var(--accent)" }
          }
        >
          {block.icon ? <Icon name={block.icon} size={18} /> : null}
          {label}
        </a>
      );
    }

    case "map": {
      const address = text(block.address);
      const query = block.query || address;
      if (!query) return null;
      return (
        <div className="space-y-3">
          {address ? <p className="whitespace-pre-line">{address}</p> : null}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            <Icon name="tabler:map-pin" size={18} />
            {t("openInMaps")}
          </a>
        </div>
      );
    }

    case "video": {
      const id = youTubeId(block.url);
      if (!id) return null;
      return (
        <div className="overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title="Video"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      );
    }

    case "faq": {
      const items = block.items.filter((item) => text(item.q));
      if (items.length === 0) return null;
      /* Native <details> so the accordion needs no JavaScript at all. */
      return (
        <div className="divide-y divide-current/10 rounded-2xl border border-current/10">
          {items.map((item, index) => (
            <details key={index} className="group px-4 py-3">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                {text(item.q)}
              </summary>
              <div className="pt-2 opacity-80">
                <RichText text={text(item.a)} />
              </div>
            </details>
          ))}
        </div>
      );
    }

    case "contact": {
      const note = text(block.note);
      const links: { href: string; label: string; icon: string }[] = [];
      if (block.phone) {
        links.push({ href: `tel:${block.phone}`, label: t("call"), icon: "tabler:phone" });
      }
      if (block.whatsapp) {
        links.push({
          href: `https://wa.me/${block.whatsapp.replace(/[^\d]/g, "")}`,
          label: t("whatsapp"),
          icon: "tabler:brand-whatsapp",
        });
      }
      if (block.email) {
        links.push({ href: `mailto:${block.email}`, label: t("email"), icon: "tabler:mail" });
      }
      if (links.length === 0 && !note) return null;

      return (
        <div className="space-y-3">
          {note ? <p>{note}</p> : null}
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white"
                style={{ background: "var(--accent)" }}
              >
                <Icon name={link.icon} size={18} />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      );
    }

    case "divider":
      return <hr className="border-current/15" />;
  }
}

export async function BlockList({ blocks, ctx }: { blocks: Block[]; ctx: Ctx }) {
  return (
    <div className="space-y-5">
      {blocks.map((block) => (
        <BlockBody key={block.id} block={block} ctx={ctx} />
      ))}
    </div>
  );
}

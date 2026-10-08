import type { ReactNode } from "react";

/**
 * A deliberately small Markdown subset: bold, italic, links, bullet lists and
 * paragraphs. Owners type this in the editor, so we never render raw HTML --
 * everything goes through React, which escapes text by construction.
 */

const INLINE_PATTERN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g;
const SAFE_PROTOCOL = /^(https?:|mailto:|tel:|\/)/i;

/** Blocks javascript: and data: URLs that an owner could paste into the editor. */
export function safeHref(href: string): string | null {
  const trimmed = href.trim();
  return SAFE_PROTOCOL.test(trimmed) ? trimmed : null;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;

    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const href = linkMatch ? safeHref(linkMatch[2]) : null;
      if (linkMatch && href) {
        nodes.push(
          <a key={key} href={href} className="gg-link" rel="noopener noreferrer" target="_blank">
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/** Single-newline inside a paragraph becomes a line break. */
function renderParagraph(text: string, key: string): ReactNode {
  const lines = text.split("\n");
  return (
    <p key={key}>
      {lines.map((line, i) => (
        <span key={`${key}-l${i}`}>
          {renderInline(line, `${key}-l${i}`)}
          {i < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </p>
  );
}

export function RichText({ text }: { text: string }) {
  if (!text.trim()) return null;

  const chunks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return (
    <div className="gg-rich">
      {chunks.map((chunk, index) => {
        const key = `b${index}`;
        const lines = chunk.split("\n").filter((l) => l.trim().length > 0);
        const isList = lines.length > 0 && lines.every((l) => /^\s*[-*]\s+/.test(l));

        if (isList) {
          return (
            <ul key={key}>
              {lines.map((line, i) => (
                <li key={`${key}-i${i}`}>
                  {renderInline(line.replace(/^\s*[-*]\s+/, ""), `${key}-i${i}`)}
                </li>
              ))}
            </ul>
          );
        }
        return renderParagraph(chunk, key);
      })}
    </div>
  );
}

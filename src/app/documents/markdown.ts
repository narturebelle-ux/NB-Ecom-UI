/**
 * A small Markdown reader for policy and onboarding documents (F27). It covers what legal text needs:
 * headings, paragraphs, bullet and numbered lists, **bold**, *italic* and [links](url). The page and the PDF
 * both draw from the same parsed blocks, so they always say the same thing. No HTML is ever passed through:
 * the page renders blocks with Angular templates, so a document can't inject markup or scripts.
 */

export interface Inline {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** Set only for safe targets: a site path, https/http, or mailto/tel. */
  href?: string;
}

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; inlines: Inline[] }
  | { type: 'paragraph'; inlines: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] };

export interface FrontMatter { [key: string]: string; }

/** Splits a leading `---` block of `key: value` lines from the Markdown that follows it. */
export function splitFrontMatter(source: string): { meta: FrontMatter; body: string } {
  const text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { meta: {}, body: text };
  const meta: FrontMatter = {};
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: text.slice(match[0].length) };
}

export function parseMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', inlines: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: 'list', ordered: list.ordered, items: list.items.map(parseInline) });
    list = null;
  };

  for (const raw of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); continue; }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph(); flushList();
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, inlines: parseInline(heading[2]) });
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }

    // A line indented under a list item continues it; anything else ends the list.
    if (list && /^\s{2,}/.test(raw)) {
      list.items[list.items.length - 1] += ' ' + line;
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

/** **bold**, *italic* / _italic_ and [text](url). Unsafe link targets become plain text. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ text: m[1], bold: true });
    else if (m[2] !== undefined || m[3] !== undefined) out.push({ text: m[2] ?? m[3], italic: true });
    else out.push(safeHref(m[5]) ? { text: m[4], href: m[5] } : { text: m[4] });
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

function safeHref(href: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(href) || (href.startsWith('/') && !href.startsWith('//'));
}

/** The words of a line, without formatting: what the PDF prints. */
export function plainText(inlines: Inline[]): string {
  return inlines.map(i => i.text).join('');
}

import { Fragment, type ReactNode } from "react";

export type InlineEdit = { text: string; start: number; end: number };

const escapable = new Set(["\\", "*", "[", "]", "(", ")"]);
const maximumDepth = 16;

function safeLink(value: string, allowBareDomain: boolean): string | null {
  const trimmed = value.trim();
  // Browsers normalize some control characters and backslashes in URLs. Reject
  // them before checking the protocol so their interpretation cannot change it.
  if (!trimmed || /[\s\\]/u.test(trimmed) || [...trimmed].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return null;
  const candidate = allowBareDomain && /^[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)+(?::\d+)?(?:[/?#]|$)/i.test(trimmed)
    ? `https://${trimmed}`
    : trimmed;
  try {
    const url = new URL(candidate);
    if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname) return url.href;
    if (url.protocol === "mailto:" && url.pathname) return url.href;
  } catch {
    return null;
  }
  return null;
}

/** Validate a toolbar URL, accepting a bare domain as an HTTPS shortcut. */
export function getSafeLink(value: string): string | null {
  return safeLink(value, true);
}

function isEscaped(text: string, index: number): boolean {
  let slashes = 0;
  while (index > 0 && text[--index] === "\\") slashes++;
  return slashes % 2 === 1;
}

function unescapeInline(text: string): string {
  return text.replace(/\\([\\*[\]()])/g, "$1");
}

type LinkSource = { label: string; destination: string; end: number };

function readLink(text: string, start: number): LinkSource | null {
  let brackets = 1;
  let cursor = start + 1;
  for (; cursor < text.length; cursor++) {
    if (text[cursor] === "\n" || text[cursor] === "\r") return null;
    if (text[cursor] === "\\" && escapable.has(text[cursor + 1])) {
      cursor++;
      continue;
    }
    if (text[cursor] === "[") brackets++;
    if (text[cursor] === "]" && --brackets === 0) break;
  }
  if (brackets !== 0 || text[cursor + 1] !== "(") return null;
  const label = text.slice(start + 1, cursor);
  const urlStart = cursor + 2;
  let parentheses = 1;
  for (cursor = urlStart; cursor < text.length; cursor++) {
    if (text[cursor] === "\n" || text[cursor] === "\r") return null;
    if (text[cursor] === "\\" && escapable.has(text[cursor + 1])) {
      cursor++;
      continue;
    }
    if (text[cursor] === "(") parentheses++;
    if (text[cursor] === ")" && --parentheses === 0) {
      return { label, destination: text.slice(urlStart, cursor), end: cursor + 1 };
    }
  }
  return null;
}

function closingBold(text: string, start: number): number {
  for (let cursor = start + 2; cursor < text.length - 1; cursor++) {
    if (text[cursor] === "\n" || text[cursor] === "\r") return -1;
    if (text[cursor] === "\\" && escapable.has(text[cursor + 1])) {
      cursor++;
      continue;
    }
    if (text.startsWith("**", cursor)) return cursor;
    if (text[cursor] === "[") {
      const link = readLink(text, cursor);
      if (link) cursor = link.end - 1;
    }
  }
  return -1;
}

function plainNodes(text: string, emphasizeMetrics: boolean): ReactNode {
  if (!emphasizeMetrics) return text;
  const metrics = /(\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?x\b|\b\d+(?:\.\d+)?\s+FPS\b|(?:>\s*)?\b\d+(?:\.\d+)?(?:\s*m)?\s+to\s+(?:approx\.\s*)?\d+(?:\.\d+)?(?:\s*(?:px|FPS|m)\b)?)/g;
  return text.split(metrics).map((part, index) => index % 2 === 1
    ? <strong className="result-metric" key={index}>{part}</strong>
    : part);
}

function parseInline(text: string, emphasizeMetrics: boolean, depth = 0, allowLinks = true): ReactNode[] {
  if (depth >= maximumDepth) return [text];
  const nodes: ReactNode[] = [];
  let plain = "";
  const flush = () => {
    if (plain) nodes.push(<Fragment key={nodes.length}>{plainNodes(plain, emphasizeMetrics)}</Fragment>);
    plain = "";
  };
  for (let cursor = 0; cursor < text.length;) {
    if (text[cursor] === "\\" && escapable.has(text[cursor + 1])) {
      plain += text[cursor + 1];
      cursor += 2;
      continue;
    }
    if (text.startsWith("**", cursor)) {
      const end = closingBold(text, cursor);
      if (end > cursor + 2) {
        flush();
        nodes.push(<strong key={nodes.length}>{parseInline(text.slice(cursor + 2, end), emphasizeMetrics, depth + 1, allowLinks)}</strong>);
        cursor = end + 2;
        continue;
      }
    }
    if (allowLinks && text[cursor] === "[") {
      const link = readLink(text, cursor);
      if (link) {
        const href = safeLink(unescapeInline(link.destination), false);
        if (href && link.label) {
          flush();
          nodes.push(<a href={href} className="inline-link" key={nodes.length} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer">{parseInline(link.label, emphasizeMetrics, depth + 1, false)}</a>);
        } else {
          // Keep the entire source visible when a destination is unsupported.
          plain += unescapeInline(text.slice(cursor, link.end));
        }
        cursor = link.end;
        continue;
      }
    }
    plain += text[cursor++];
  }
  flush();
  return nodes;
}

/** A deliberately small inline syntax: **bold** and [label](https://url). */
export function InlineText({ text, emphasizeMetrics = false }: { text: string; emphasizeMetrics?: boolean }) {
  return <>{parseInline(text, emphasizeMetrics)}</>;
}

function selectionBounds(text: string, start: number, end: number) {
  const first = Math.max(0, Math.min(text.length, start));
  const last = Math.max(0, Math.min(text.length, end));
  return [Math.min(first, last), Math.max(first, last)];
}

type BoldEdit = {
  from: number;
  to: number;
  replacement: string;
  selectedStart: number;
  selectedEnd: number;
};

function boldRanges(text: string, offset = 0, allowLinks = true, depth = 0): Array<{ start: number; end: number }> {
  if (depth >= maximumDepth) return [];
  const ranges: Array<{ start: number; end: number }> = [];
  for (let cursor = 0; cursor < text.length;) {
    if (text[cursor] === "\\" && escapable.has(text[cursor + 1])) {
      cursor += 2;
      continue;
    }
    if (text.startsWith("**", cursor)) {
      const end = closingBold(text, cursor);
      if (end > cursor + 2) {
        ranges.push({ start: offset + cursor, end: offset + end + 2 });
        ranges.push(...boldRanges(text.slice(cursor + 2, end), offset + cursor + 2, allowLinks, depth + 1));
        cursor = end + 2;
        continue;
      }
    }
    if (allowLinks && text[cursor] === "[") {
      const link = readLink(text, cursor);
      if (link) {
        if (safeLink(unescapeInline(link.destination), false)) ranges.push(...boldRanges(link.label, offset + cursor + 1, false, depth + 1));
        cursor = link.end;
        continue;
      }
    }
    cursor++;
  }
  return ranges;
}

/** Toggle each selected nonempty line without introducing cross-bullet markup. */
export function toggleBold(text: string, start: number, end: number): InlineEdit {
  [start, end] = selectionBounds(text, start, end);
  if (start === end) {
    return { text: `${text.slice(0, start)}****${text.slice(end)}`, start: start + 2, end: start + 2 };
  }
  const ranges = boldRanges(text);
  // Selecting half a delimiter should toggle the same content as selecting
  // the full delimiter, rather than leaving a stray asterisk in the preview.
  for (const range of ranges) {
    for (const delimiter of [range.start, range.end - 2]) {
      if (start === delimiter + 1) start = delimiter;
      if (end === delimiter + 1) end = delimiter + 2;
    }
  }
  // A selection extending out of an existing bold span should keep that span
  // bold. Include its already-bold remainder before normalizing the selection,
  // so a closing/opening marker cannot accidentally invert the selected text.
  // Fully contained selections still use the partial-unbold behavior below.
  if (!ranges.some((range) => start >= range.start && end <= range.end)) {
    for (const range of ranges) {
      if (range.start < end && range.end > start) {
        start = Math.min(start, range.start);
        end = Math.max(end, range.end);
      }
    }
  }
  const edits: BoldEdit[] = [];
  const selected = text.slice(start, end);
  for (const match of selected.matchAll(/[^\r\n]+/g)) {
    const value = match[0];
    if (!value.trim()) continue;
    const from = start + match.index;
    const to = from + value.length;
    // A multiline selection can include the closing markers on its first line
    // and the opening markers on its last line. Recognize those partial pairs.
    const wrappedFrom = value.startsWith("**") ? from : text.slice(from - 2, from) === "**" ? from - 2 : from;
    const wrappedTo = value.endsWith("**") ? to : text.slice(to, to + 2) === "**" ? to + 2 : to;
    const wrapped = text.slice(wrappedFrom, wrappedTo);
    if (wrapped.startsWith("**") && wrapped.length > 4 && !isEscaped(text, wrappedFrom) && closingBold(wrapped, 0) === wrapped.length - 2) {
      const replacement = wrapped.slice(2, -2);
      edits.push({ from: wrappedFrom, to: wrappedTo, replacement, selectedStart: 0, selectedEnd: replacement.length });
    } else {
      const containing = ranges.findLast((range) => from >= range.start + 2 && to <= range.end - 2);
      if (containing) {
        const before = text.slice(containing.start + 2, from);
        const after = text.slice(to, containing.end - 2);
        const prefix = before ? `**${before}**` : "";
        const suffix = after ? `**${after}**` : "";
        edits.push({ from: containing.start, to: containing.end, replacement: prefix + value + suffix, selectedStart: prefix.length, selectedEnd: prefix.length + value.length });
      } else {
        // Wrapping mixed plain/bold source directly would turn its inner **
        // markers into outer closing markers and invert the existing emphasis.
        // Remove only recognized, fully selected bold delimiters; escaped
        // asterisks and asterisks in link destinations remain untouched.
        const delimiters = new Set<number>();
        for (const range of ranges) {
          if (range.start >= from && range.end <= to) {
            for (const index of [range.start, range.start + 1, range.end - 2, range.end - 1]) delimiters.add(index);
          }
        }
        let content = "";
        for (let index = from; index < to; index++) if (!delimiters.has(index)) content += text[index];
        if (isEscaped(content, content.length)) content += "\\";
        if (content.endsWith("*") && !content.endsWith("**") && !isEscaped(content, content.length - 1)) content = `${content.slice(0, -1)}\\*`;
        edits.push({ from, to, replacement: `**${content}**`, selectedStart: 2, selectedEnd: content.length + 2 });
      }
    }
  }
  let cursor = 0;
  let output = "";
  let delta = 0;
  let newStart: number | undefined;
  let newEnd: number | undefined;
  for (const edit of edits) {
    output += text.slice(cursor, edit.from) + edit.replacement;
    if (start >= edit.from && start <= edit.to) newStart = edit.from + delta + edit.selectedStart;
    if (end >= edit.from && end <= edit.to) newEnd = edit.from + delta + edit.selectedEnd;
    delta += edit.replacement.length - (edit.to - edit.from);
    cursor = edit.to;
  }
  return { text: output + text.slice(cursor), start: newStart ?? start, end: newEnd ?? end + delta };
}

function escapeLinkLabel(label: string): string {
  let escaped = "";
  for (let cursor = 0; cursor < label.length; cursor++) {
    const character = label[cursor];
    if (character === "\\" && escapable.has(label[cursor + 1])) {
      escaped += character + label[++cursor];
    } else {
      escaped += character === "[" || character === "]" || (character === "\\" && cursor === label.length - 1) ? `\\${character}` : character;
    }
  }
  return escaped;
}

/** Insert a link; labels may retain bold markup but cannot create nested links. */
export function makeLinkEdit(text: string, start: number, end: number, label: string, url: string): InlineEdit {
  [start, end] = selectionBounds(text, start, end);
  const href = getSafeLink(url);
  if (!href) throw new Error("Enter an HTTP, HTTPS, or mailto link.");
  if (/[\r\n]/.test(label)) throw new Error("Link text must stay on one line.");
  const safeLabel = escapeLinkLabel(label || href);
  const destination = href.replace(/[()]/g, "\\$&");
  const replacement = `[${safeLabel}](${destination})`;
  return {
    text: text.slice(0, start) + replacement + text.slice(end),
    start: start + 1,
    end: start + 1 + safeLabel.length,
  };
}

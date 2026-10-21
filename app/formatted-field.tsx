"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getSafeLink, makeLinkEdit, toggleBold } from "./inline-format";

const labels = {
  en: { bold: "Bold", link: "Insert link", hint: "Select text to format, or type **bold** and [text](https://…).", text: "Link text", url: "Link address", apply: "Apply link", cancel: "Cancel", invalid: "Enter a valid http, https, or email link.", required: "Enter the text to display.", multiline: "Select text within a single line for a link.", changed: "This text has changed. Select it again to insert a link." },
  zh: { bold: "加粗", link: "插入链接", hint: "选中文字后设置格式，也可输入 **加粗** 和 [文字](https://…)。", text: "链接文字", url: "链接地址", apply: "应用链接", cancel: "取消", invalid: "请输入有效的 http、https 或邮件链接。", required: "请输入要显示的文字。", multiline: "请在同一行内选取要添加链接的文字。", changed: "文本已更新，请重新选择文字后插入链接。" },
};

type Selection = { start: number; end: number };

export function FormattedField({ label, value, onChange, locale, rows, className = "field-wide" }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  locale: "en" | "zh";
  rows?: number;
  className?: string;
}) {
  const id = useId();
  const copy = labels[locale];
  const field = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const linkAddress = useRef<HTMLInputElement | null>(null);
  const selection = useRef<Selection>({ start: 0, end: 0 });
  const [link, setLink] = useState<{ source: string; start: number; end: number; label: string; url: string } | null>(null);
  const [error, setError] = useState("");
  const linkOpen = link !== null;

  useEffect(() => {
    if (linkOpen) linkAddress.current?.focus();
  }, [linkOpen]);

  const rememberSelection = () => {
    if (field.current) selection.current = { start: field.current.selectionStart ?? 0, end: field.current.selectionEnd ?? 0 };
  };
  const focusSelection = (next: Selection) => {
    selection.current = next;
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.setSelectionRange(next.start, next.end);
    });
  };
  const bold = () => {
    const edit = toggleBold(value, selection.current.start, selection.current.end);
    onChange(edit.text);
    focusSelection(edit);
  };
  const openLink = () => {
    const { start, end } = selection.current;
    if (/[\r\n]/.test(value.slice(start, end))) {
      setError(copy.multiline);
      focusSelection(selection.current);
      return;
    }
    setError("");
    setLink({ source: value, start, end, label: value.slice(start, end), url: "" });
  };
  const cancelLink = () => {
    setLink(null);
    setError("");
    focusSelection(selection.current);
  };
  const applyLink = () => {
    if (!link) return;
    if (value !== link.source) {
      setLink(null);
      setError(copy.changed);
      focusSelection({ start: 0, end: 0 });
      return;
    }
    if (!link.label.trim()) return setError(copy.required);
    if (/[\r\n]/.test(link.label)) return setError(copy.multiline);
    if (!getSafeLink(link.url)) return setError(copy.invalid);
    const edit = makeLinkEdit(link.source, link.start, link.end, link.label, link.url);
    onChange(edit.text);
    setLink(null);
    setError("");
    focusSelection(edit);
  };
  const linkKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>) => {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === "Escape") { event.preventDefault(); cancelLink(); }
    if (event.key === "Enter" && event.currentTarget instanceof HTMLInputElement) { event.preventDefault(); applyLink(); }
  };
  const props = {
    id,
    value,
    disabled: !!link,
    "aria-describedby": `${id}-hint${error && !link ? ` ${id}-error` : ""}`,
    onSelect: rememberSelection,
    onBlur: rememberSelection,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setError("");
      onChange(event.target.value);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      if ((event.metaKey || event.ctrlKey) && !event.altKey && ["b", "k"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        rememberSelection();
        if (event.key.toLowerCase() === "b") bold();
        else openLink();
      }
    },
  };

  return <div className={`formatted-field ${className}`}>
    <div className="formatted-field-heading">
      <label htmlFor={id}>{label}</label>
      <div className="format-actions" role="group" aria-label={`${label} — ${locale === "zh" ? "格式" : "formatting"}`}>
        <button type="button" title={`${copy.bold} (⌘/Ctrl+B)`} aria-label={`${copy.bold}: ${label}`} disabled={!!link} onMouseDown={(event) => event.preventDefault()} onClick={bold}><b>B</b></button>
        <button type="button" title={`${copy.link} (⌘/Ctrl+K)`} aria-label={`${copy.link}: ${label}`} disabled={!!link} onMouseDown={(event) => event.preventDefault()} onClick={openLink}>{copy.link}</button>
      </div>
    </div>
    {rows ? <textarea {...props} rows={rows} ref={(element) => { field.current = element; }} /> : <input {...props} ref={(element) => { field.current = element; }} />}
    <small id={`${id}-hint`} className="format-hint">{copy.hint}</small>
    {link && <div className="link-editor" role="group" aria-label={`${copy.link}: ${label}`}>
      <label htmlFor={`${id}-link-label`}><span>{copy.text}</span></label>
      <input id={`${id}-link-label`} value={link.label} onKeyDown={linkKeyDown} onChange={(event) => setLink({ ...link, label: event.target.value })} />
      <label htmlFor={`${id}-link-url`}><span>{copy.url}</span></label>
      <input id={`${id}-link-url`} ref={linkAddress} value={link.url} placeholder="https://…" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} onKeyDown={linkKeyDown} onChange={(event) => { setError(""); setLink({ ...link, url: event.target.value }); }} />
      <div className="link-editor-actions"><button type="button" className="primary-button" onKeyDown={linkKeyDown} onClick={applyLink}>{copy.apply}</button><button type="button" className="text-button" onKeyDown={linkKeyDown} onClick={cancelLink}>{copy.cancel}</button></div>
    </div>}
    {error && <p id={`${id}-error`} className="format-error" role="alert">{error}</p>}
  </div>;
}

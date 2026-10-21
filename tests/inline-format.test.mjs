import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const source = readFileSync(new URL("../app/inline-format.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const loadedModule = { exports: {} };
vm.runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports, require: createRequire(import.meta.url), URL });
const { InlineText, getSafeLink, toggleBold, makeLinkEdit } = loadedModule.exports;
const render = (text, emphasizeMetrics = false) => renderToStaticMarkup(createElement(InlineText, { text, emphasizeMetrics }));
const comparable = (value) => JSON.parse(JSON.stringify(value));

test("renders explicit bold and preserves plain text and literal HTML", () => {
  assert.equal(render("Implemented **Gaussian Splatting**."), "Implemented <strong>Gaussian Splatting</strong>.");
  assert.equal(render("<img src=x onerror=alert(1)> & text"), "&lt;img src=x onerror=alert(1)&gt; &amp; text");
  assert.equal(render("普通文本 **程浩**"), "普通文本 <strong>程浩</strong>");
});

test("renders bold link labels and links inside bold without nested anchors", () => {
  assert.equal(render("[**Chenghao Jiang**](https://example.com/paper)"), '<a href="https://example.com/paper" class="inline-link" target="_blank" rel="noopener noreferrer"><strong>Chenghao Jiang</strong></a>');
  assert.equal(render("**Read [paper](https://example.com)**"), '<strong>Read <a href="https://example.com/" class="inline-link" target="_blank" rel="noopener noreferrer">paper</a></strong>');
  const nested = render("[outer [inner](https://inner.example)](https://outer.example)");
  assert.equal((nested.match(/<a /g) ?? []).length, 1);
  assert.match(nested, /outer \[inner\]\(https:\/\/inner.example\)/);
});

test("accepts balanced or escaped URL parentheses and encoded query parameters", () => {
  for (const source of [
    "[Wiki](https://en.wikipedia.org/wiki/Splatting_(graphics))",
    String.raw`[Wiki](https://en.wikipedia.org/wiki/Splatting_\(graphics\))`,
  ]) assert.match(render(source), /href="https:\/\/en.wikipedia.org\/wiki\/Splatting_\(graphics\)"/);
  assert.match(render("[Paper](https://example.com/?a=1&b=2)"), /href="https:\/\/example.com\/\?a=1&amp;b=2"/);
  assert.match(render("[Email](mailto:hello@example.com)"), /href="mailto:hello@example.com"/);
  assert.doesNotMatch(render("[Email](mailto:hello@example.com)"), /target=/);
});

test("keeps incomplete, empty, and multiline markup visible", () => {
  for (const value of ["**unclosed", "****", "[label]", "[label](https://example.com", "[](https://example.com)", "**first\nsecond**", "[first\nsecond](https://example.com)"]) {
    assert.equal(render(value), value);
  }
});

test("supports escaped syntax without treating ordinary backslashes as escapes", () => {
  assert.equal(render(String.raw`\**literal\** and \[label\](https://example.com)`), "**literal** and [label](https://example.com)");
  assert.equal(render(String.raw`C:\research\paper and \\server`), String.raw`C:\research\paper and \server`);
  assert.equal(render(String.raw`[A \[draft\]](https://example.com)`), '<a href="https://example.com/" class="inline-link" target="_blank" rel="noopener noreferrer">A [draft]</a>');
});

test("unsafe, relative, and bare-domain destinations remain inert source text", () => {
  for (const url of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,test", "vbscript:evil", "file:///etc/passwd", "/relative", "//example.com", "example.com", "https:\\evil.example", "java\tscript:alert(1)"]) {
    const value = `[label](${url})`;
    const output = render(value);
    assert.doesNotMatch(output, /<a /);
    assert.match(output, /\[label\]/);
  }
  assert.equal(render("[**name**](javascript:alert(1))"), "[**name**](javascript:alert(1))");
});

test("metric emphasis remains optional and combines with manual formatting", () => {
  assert.equal(render("20 FPS and 35%"), "20 FPS and 35%");
  assert.equal(render("20 FPS and 35%", true), '<strong class="result-metric">20 FPS</strong> and <strong class="result-metric">35%</strong>');
  const output = render("**Gaussian Splatting** at [20 FPS](https://example.com)", true);
  assert.match(output, /<strong>Gaussian Splatting<\/strong>/);
  assert.match(output, /<a [^>]+><strong class="result-metric">20 FPS<\/strong><\/a>/);
});

test("toolbar URL validation normalizes domains and rejects unsupported protocols", () => {
  assert.equal(getSafeLink(" example.com/paper "), "https://example.com/paper");
  assert.equal(getSafeLink("www.example.com"), "https://www.example.com/");
  assert.equal(getSafeLink("https://example.com"), "https://example.com/");
  assert.equal(getSafeLink("http://localhost:3000/paper"), "http://localhost:3000/paper");
  assert.equal(getSafeLink("mailto:hello@example.com"), "mailto:hello@example.com");
  for (const value of ["", "javascript:alert(1)", "data:text/html,test", "file:///tmp/paper", "mailto:", "paper", "https://", "https://example.com/a b", "https://example.com/\u0000", "https:\\evil.example"]) {
    assert.equal(getSafeLink(value), null, value);
  }
});

test("bold toolbar wraps selection and toggles either selected source or content", () => {
  const original = "Use Gaussian Splatting today";
  const bold = toggleBold(original, 4, 22);
  assert.deepEqual(comparable(bold), { text: "Use **Gaussian Splatting** today", start: 6, end: 24 });
  assert.deepEqual(comparable(toggleBold(bold.text, bold.start, bold.end)), { text: original, start: 4, end: 22 });
  assert.deepEqual(comparable(toggleBold(bold.text, 4, 26)), { text: original, start: 4, end: 22 });
});

test("bold toolbar keeps multiline selections on separate lines and skips blanks", () => {
  const original = "one\n\n two\r\n   \nthree";
  const bold = toggleBold(original, 0, original.length);
  assert.equal(bold.text, "**one**\n\n** two**\r\n   \n**three**");
  assert.equal(bold.text.slice(bold.start, bold.end), "one**\n\n** two**\r\n   \n**three");
  assert.equal(toggleBold(bold.text, bold.start, bold.end).text, original);
  assert.equal(toggleBold(bold.text, 0, bold.text.length).text, original);
  assert.equal(toggleBold("  \n", 0, 3).text, "  \n");
});

test("bold toolbar supports a caret and normalizes backward and out-of-range selections", () => {
  assert.deepEqual(comparable(toggleBold("abc", 1, 1)), { text: "a****bc", start: 3, end: 3 });
  assert.deepEqual(comparable(toggleBold("abc", 3, 0)), { text: "**abc**", start: 2, end: 5 });
  assert.deepEqual(comparable(toggleBold("abc", -5, 20)), { text: "**abc**", start: 2, end: 5 });
});

test("bold toolbar tolerates selections splitting delimiters or selecting part of bold text", () => {
  assert.equal(toggleBold("**name**", 1, 7).text, "name");
  assert.equal(toggleBold("**name**", 2, 7).text, "name");
  assert.equal(toggleBold("**name**", 1, 6).text, "name");
  const partial = toggleBold("**Gaussian Splatting**", 2, 10);
  assert.equal(partial.text, "Gaussian** Splatting**");
  assert.equal(partial.text.slice(partial.start, partial.end), "Gaussian");
  assert.equal(render(partial.text), "Gaussian<strong> Splatting</strong>");
  const middle = toggleBold("**name**", 3, 5);
  assert.equal(middle.text, "**n**am**e**");
  assert.equal(middle.text.slice(middle.start, middle.end), "am");
  assert.equal(render(middle.text), "<strong>n</strong>am<strong>e</strong>");
});

test("bold toolbar retains trailing literal asterisks and backslashes", () => {
  assert.equal(render(toggleBold("name*", 0, 5).text), "<strong>name*</strong>");
  assert.equal(render(toggleBold("folder\\", 0, 7).text), "<strong>folder\\</strong>");
});

test("bold toolbar preserves existing emphasis when a selection mixes plain and bold source", () => {
  for (const source of ["one **two** three", "**one** two **three**"]) {
    const edit = toggleBold(source, 0, source.length);
    assert.equal(edit.text, "**one two three**");
    assert.equal(render(edit.text), "<strong>one two three</strong>");
    assert.equal(toggleBold(edit.text, edit.start, edit.end).text, "one two three");
  }
});

test("mixed bold normalization preserves escapes, links, and literal URL asterisks", () => {
  const source = String.raw`Read \**literal\** [**paper**](https://example.com/path**id**) with **results**`;
  const edit = toggleBold(source, 0, source.length);
  assert.equal(edit.text, String.raw`**Read \**literal\** [paper](https://example.com/path**id**) with results**`);
  assert.equal(render(edit.text), '<strong>Read **literal** <a href="https://example.com/path**id**" class="inline-link" target="_blank" rel="noopener noreferrer">paper</a> with results</strong>');
});

test("selections crossing a bold boundary preserve the already-bold remainder", () => {
  for (const [source, start, end] of [
    ["**one two** three", 6, 17],
    ["one **two three**", 0, 9],
    ["**one two** and **three four**", 6, 22],
  ]) {
    const edit = toggleBold(source, start, end);
    const expected = source.replaceAll("**", "");
    assert.equal(edit.text, `**${expected}**`);
    assert.equal(render(edit.text), `<strong>${expected}</strong>`);
    assert.equal(edit.text.slice(edit.start, edit.end), expected);
  }
  // Expanding boundary crossings must not change how a wholly contained
  // selection toggles just the chosen words out of an existing bold phrase.
  assert.equal(toggleBold("**one two** three", 6, 9).text, "**one **two three");
});

test("link toolbar preserves bold, replaces only selection, and handles parentheses", () => {
  const result = makeLinkEdit("By **Chenghao** today", 3, 15, "**Chenghao**", "example.com/paper_(draft)");
  assert.equal(result.text, String.raw`By [**Chenghao**](https://example.com/paper_\(draft\)) today`);
  assert.equal(result.text.slice(result.start, result.end), "**Chenghao**");
  assert.match(render(result.text), /<a href="https:\/\/example.com\/paper_\(draft\)"[^>]+><strong>Chenghao<\/strong><\/a>/);
});

test("link toolbar escapes nested link labels while preserving existing escapes", () => {
  for (const label of ["[draft](https://inner.example)", String.raw`\[draft\]`, String.raw`\**literal\**`]) {
    const result = makeLinkEdit("", 0, 0, label, "https://outer.example");
    const output = render(result.text);
    assert.equal((output.match(/<a /g) ?? []).length, 1);
    assert.doesNotMatch(output, /<strong>/);
  }
  const literal = makeLinkEdit("", 0, 0, '<script>alert("x")</script>', "https://example.com");
  assert.doesNotMatch(render(literal.text), /<script>/);
  const trailingSlash = makeLinkEdit("", 0, 0, "folder\\", "https://example.com");
  assert.match(render(trailingSlash.text), /folder\\<\/a>/);
});

test("link toolbar rejects invalid destinations and multiline labels", () => {
  assert.throws(() => makeLinkEdit("original", 0, 8, "label", "javascript:alert(1)"), /HTTP/);
  assert.throws(() => makeLinkEdit("original", 0, 8, "one\ntwo", "https://example.com"), /one line/);
  assert.equal(makeLinkEdit("", 0, 0, "", "example.com").text, "[https://example.com/](https://example.com/)");
});

test("formatted strings survive JSON serialization unchanged", () => {
  const input = String.raw`**Gaussian Splatting** by [**Chenghao Jiang**](https://example.com/paper_\(draft\))`;
  const restored = JSON.parse(JSON.stringify({ text: input })).text;
  assert.equal(restored, input);
  assert.equal(render(restored), render(input));
});

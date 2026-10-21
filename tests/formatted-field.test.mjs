import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const compile = (name) => ts.transpileModule(readFileSync(new URL(`../app/${name}`, import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const inlineModule = { exports: {} };
vm.runInNewContext(compile("inline-format.tsx"), { module: inlineModule, exports: inlineModule.exports, require, URL });
const fieldSource = compile("formatted-field.tsx");

function elements(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}

// Run the component's real event handlers with persistent hook slots. This
// intentionally tests state/selection transitions without emulating a browser.
function createField(initialValue) {
  const slots = [];
  const frames = [];
  const effects = [];
  const changes = [];
  let cursor = 0;
  let value = initialValue;
  let nodes = [];
  let focusedId = null;
  class InputElement {
    constructor(id) { this.id = id; }
    selectionStart = 0;
    selectionEnd = 0;
    focused = false;
    focusCount = 0;
    focus() { this.focused = true; this.focusCount++; focusedId = this.id; }
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  }
  const inputs = new Map(["field-id", "field-id-link-url", "field-id-link-label"].map((id) => [id, new InputElement(id)]));
  const input = inputs.get("field-id");
  const hooks = {
    useId: () => "field-id",
    useRef: (initial) => slots[cursor++] ??= { current: initial },
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useEffect: (effect, dependencies) => {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || dependencies.some((dependency, position) => !Object.is(dependency, previous[position]))) effects.push(effect);
      slots[index] = dependencies;
    },
  };
  const loadedModule = { exports: {} };
  vm.runInNewContext(fieldSource, {
    module: loadedModule,
    exports: loadedModule.exports,
    require: (name) => name === "react" ? hooks : name === "./inline-format" ? inlineModule.exports : require(name),
    HTMLInputElement: InputElement,
    requestAnimationFrame: (callback) => frames.push(callback),
  });
  const find = (predicate) => nodes.find(predicate);
  const render = (nextValue = value) => {
    value = nextValue;
    cursor = 0;
    for (const node of nodes) if (node.props?.ref && typeof node.props.ref === "object") node.props.ref.current = null;
    nodes = elements(loadedModule.exports.FormattedField({
      label: "Title", value, locale: "en",
      onChange: (next) => { changes.push(next); value = next; },
    }));
    find((node) => node.props.id === "field-id").props.ref(input);
    for (const node of nodes) if (node.props?.ref && typeof node.props.ref === "object") node.props.ref.current = inputs.get(node.props.id);
    for (const effect of effects.splice(0)) effect();
    for (const frame of frames.splice(0)) frame();
  };
  const select = (start, end) => {
    input.setSelectionRange(start, end);
    find((node) => node.props.id === "field-id").props.onSelect();
  };
  const click = (label) => {
    const button = find((node) => node.type === "button" && (node.props["aria-label"] === label || node.props.children === label));
    assert.ok(button, `Expected button: ${label}`);
    button.props.onClick();
    render();
  };
  const change = (id, nextValue) => {
    find((node) => node.props.id === id).props.onChange({ target: { value: nextValue } });
    render();
  };
  const key = (surface, keyValue, options = {}) => {
    let prevented = false;
    const id = surface === "source" ? "field-id" : surface === "label" ? "field-id-link-label" : "field-id-link-url";
    const node = find((node) => surface === "apply" || surface === "cancel"
      ? node.type === "button" && node.props.children === (surface === "apply" ? "Apply link" : "Cancel")
      : node.props.id === id);
    const target = surface === "apply" || surface === "cancel" ? {} : inputs.get(id);
    assert.ok(node, `Expected ${surface}`);
    node.props.onKeyDown({
      key: keyValue, ctrlKey: false, metaKey: false, altKey: false,
      nativeEvent: { isComposing: false, keyCode: keyValue === "Enter" ? 13 : 0 },
      target, currentTarget: target, preventDefault: () => { prevented = true; }, ...options,
    });
    render();
    return prevented;
  };
  render();
  return { render, select, click, change, key, find, changes, input, inputs, get focusedId() { return focusedId; }, get value() { return value; }, get hasLinkPanel() { return !!find((node) => node.props.className === "link-editor"); } };
}

function openLink(field) {
  field.select(5, 10);
  field.click("Insert link: Title");
  field.change("field-id-link-url", "example.com/paper");
}

test("valid link insertion replaces the selected text and restores its selection", () => {
  const field = createField("Read paper today");
  openLink(field);
  assert.equal(field.find((node) => node.props.id === "field-id").props.disabled, true);
  assert.equal(field.key("panel", "Enter"), true);
  assert.deepEqual(field.changes, ["Read [paper](https://example.com/paper) today"]);
  assert.equal(field.hasLinkPanel, false);
  assert.equal(field.input.focused, true);
  assert.equal(field.value.slice(field.input.selectionStart, field.input.selectionEnd), "paper");
});

test("an externally changed source cannot be overwritten by an open link panel", () => {
  const field = createField("Read paper today");
  openLink(field);
  field.render("New imported title");
  field.click("Apply link");
  assert.deepEqual(field.changes, []);
  assert.equal(field.value, "New imported title");
  assert.equal(field.hasLinkPanel, false);
  assert.equal(field.find((node) => node.props.id === "field-id").props.disabled, false);
});

test("IME Enter and Escape preserve the link panel until composition ends", () => {
  for (const nativeEvent of [{ isComposing: true, keyCode: 13 }, { isComposing: false, keyCode: 229 }]) {
    const field = createField("Read paper today");
    openLink(field);
    for (const keyValue of ["Enter", "Escape"]) {
      assert.equal(field.key("panel", keyValue, { nativeEvent }), false);
      assert.deepEqual(field.changes, []);
      assert.equal(field.hasLinkPanel, true);
    }
    field.key("panel", "Enter");
    assert.equal(field.changes.length, 1);
    assert.equal(field.hasLinkPanel, false);
  }
});

test("IME key events do not trigger source formatting shortcuts", () => {
  for (const nativeEvent of [{ isComposing: true, keyCode: 66 }, { isComposing: false, keyCode: 229 }]) {
    const field = createField("Read paper today");
    field.select(5, 10);
    for (const keyValue of ["b", "k"]) {
      assert.equal(field.key("source", keyValue, { ctrlKey: true, nativeEvent }), false);
      assert.deepEqual(field.changes, []);
      assert.equal(field.hasLinkPanel, false);
    }
    assert.equal(field.key("source", "b", { ctrlKey: true }), true);
    assert.deepEqual(field.changes, ["Read **paper** today"]);
  }
});

test("opening a link focuses its address once and preserves focus while editing", () => {
  const field = createField("Read paper today");
  openLink(field);
  assert.equal(field.focusedId, "field-id-link-url");
  assert.equal(field.inputs.get("field-id-link-url").focusCount, 1);
  field.inputs.get("field-id-link-label").focus();
  field.change("field-id-link-label", "Updated paper title");
  field.render();
  assert.equal(field.focusedId, "field-id-link-label");
  assert.equal(field.inputs.get("field-id-link-url").focusCount, 1);
  field.click("Cancel");
  assert.equal(field.focusedId, "field-id");
  openLink(field);
  assert.equal(field.focusedId, "field-id-link-url");
  assert.equal(field.inputs.get("field-id-link-url").focusCount, 2);
});

test("interactive link controls support Escape and leave button Enter activation native", () => {
  for (const surface of ["label", "panel", "apply", "cancel"]) {
    const field = createField("Read paper today");
    openLink(field);
    assert.equal(field.key(surface, "Escape"), true);
    assert.equal(field.hasLinkPanel, false);
    assert.deepEqual(field.changes, []);
    assert.equal(field.focusedId, "field-id");
  }
  const field = createField("Read paper today");
  openLink(field);
  assert.equal(field.key("cancel", "Enter"), false);
  assert.deepEqual(field.changes, []);
  field.click("Cancel");
  assert.equal(field.hasLinkPanel, false);
});

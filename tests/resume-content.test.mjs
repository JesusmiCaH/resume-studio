import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../app/resume-builder.tsx", import.meta.url), "utf8");
const data = source.slice(source.indexOf("const tabs:"), source.indexOf("export function ResumeBuilder"));
const context = vm.createContext({});
vm.runInContext(ts.transpileModule(`${data}\nglobalThis.api = { initialResume, migrateSavedResume };`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { initialResume, migrateSavedResume } = context.api;
const clone = (value) => JSON.parse(JSON.stringify(value));

test("migrates legacy Tera drafts without altering other resume content", () => {
  for (const contentVersion of [undefined, 1, 13, 14, 15]) {
    const draft = clone(initialResume);
    draft.profile.headline = "Personal draft";
    draft.experience[0].bullets = ["Withdrawn internal description"];
    draft.experience[0].date = "Feb 2026 — Present";
    draft.experience[1].bullets = ["Withdrawn internship description"];
    const before = clone(draft);
    const result = clone(migrateSavedResume({ resume: draft, contentVersion }));
    assert.deepEqual(result.experience.slice(0, 2), clone(initialResume.experience.slice(0, 2)));
    assert.deepEqual(result.experience.slice(2), draft.experience.slice(2));
    for (const key of ["profile", "education", "projects", "publications", "skills"]) {
      assert.deepEqual(result[key], draft[key]);
    }
    assert.deepEqual(draft, before);
  }
});

test("recognizes imported Tera IDs and preserves removed roles and current drafts", () => {
  const draft = clone(initialResume);
  draft.experience[0].id = "imported-researcher";
  draft.experience[0].bullets = ["Withdrawn description"];
  draft.experience[1].id = "imported-intern";
  draft.experience[1].bullets = ["Withdrawn description"];
  const result = migrateSavedResume({ resume: draft });
  assert.deepEqual(clone(result.experience[0].bullets), clone(initialResume.experience[0].bullets));
  assert.deepEqual(clone(result.experience[1].bullets), clone(initialResume.experience[1].bullets));
  draft.experience = draft.experience.slice(2);
  assert.deepEqual(clone(migrateSavedResume({ resume: draft, contentVersion: 15 })), draft);
  assert.equal(migrateSavedResume({ resume: draft, contentVersion: 16 }), draft);
});

test("Tera copy contains only the attributed public numeric target", () => {
  const roles = initialResume.experience.filter((item) => item.subtitle === "Tera AI");
  const text = roles.flatMap((item) => item.bullets).join(" ");
  assert.match(text, /publicly documented camera-input target of 20 FPS/);
  assert.deepEqual(text.match(/\b\d+(?:\.\d+)?\b/g), ["20"]);
  assert.doesNotMatch(text, /RMSE|endpoint error|\d+%|versus/);
  assert.equal(roles[0].date, "Feb 2026 — Sep 2026");
  assert.equal(roles[1].date, "Aug 2025 — Feb 2026");
});

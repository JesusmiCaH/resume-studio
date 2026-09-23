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
  assert.equal(migrateSavedResume({ resume: draft, contentVersion: 18 }), draft);
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


test("restores the approved reconstruction methods in v16 drafts without replacing other edits", () => {
  const draft = clone(initialResume);
  draft.experience[0].bullets[0] = "Custom data pipeline description";
  draft.experience[0].bullets[3] = "Implemented and evaluated 3D reconstruction pipelines from video, assessing geometric accuracy and visual consistency.";
  draft.experience[0].date = "Custom date";
  const expected = clone(draft);
  expected.experience[0].bullets[3] = "Implemented and benchmarked video-based 3D reconstruction pipelines spanning classical SfM, feed-forward 3D models, and Gaussian Splatting, assessing geometric accuracy and visual consistency.";
  assert.deepEqual(clone(migrateSavedResume({ resume: draft, contentVersion: 16 })), expected);
  draft.experience[0].bullets[3] = "Custom reconstruction description";
  assert.deepEqual(clone(migrateSavedResume({ resume: draft, contentVersion: 16 })), draft);
});


test("combines the approved methods and evaluation criteria in v17 drafts", () => {
  const draft = clone(initialResume);
  draft.experience[0].bullets[3] = "Implemented and benchmarked 3D reconstruction pipelines spanning classical SfM, feed-forward 3D models, and Gaussian Splatting.";
  const result = migrateSavedResume({ resume: draft, contentVersion: 17 });
  assert.equal(result.experience[0].bullets[3], "Implemented and benchmarked video-based 3D reconstruction pipelines spanning classical SfM, feed-forward 3D models, and Gaussian Splatting, assessing geometric accuracy and visual consistency.");
  assert.deepEqual(clone(result.experience.slice(1)), draft.experience.slice(1));
});


test("repairs the known LinkedIn address in current and old drafts without changing other content", () => {
  const target = "https://www.linkedin.com/in/chenghao-jiang-93a979228/";
  assert.equal(initialResume.profile.linkedin, target);
  for (const version of [undefined, 15, 16, 17, 18, 19]) {
    for (const address of ["Chenghao-Jiang", "https://linkedin.com/in/Chenghao-Jiang", "https://www.linkedin.com/in/chenghao-jiang/"]) {
      const draft = clone(initialResume);
      draft.profile.linkedin = address;
      const result = clone(migrateSavedResume({ resume: draft, contentVersion: version }));
      const expected = clone(draft);
      expected.profile.linkedin = target;
      assert.deepEqual(result, expected);
      assert.equal(draft.profile.linkedin, address);
    }
  }
  for (const address of ["", "https://www.linkedin.com/in/another-profile/"]) {
    const draft = clone(initialResume);
    draft.profile.linkedin = address;
    assert.equal(migrateSavedResume({ resume: draft, contentVersion: 18 }), draft);
  }
});

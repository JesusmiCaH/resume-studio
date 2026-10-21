import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../app/resume-builder.tsx", import.meta.url), "utf8");
const data = source.slice(source.indexOf("const tabs:"), source.indexOf("export function ResumeBuilder"));
const context = vm.createContext({});
vm.runInContext(ts.transpileModule(`${data}\nglobalThis.api = { initialResume, migrateSavedResume, serializeResume, parseResumeImport };`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { initialResume, migrateSavedResume, serializeResume, parseResumeImport } = context.api;
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


test("corrects only the Wisconsin GPA while preserving local edits and other schools", () => {
  assert.equal(initialResume.education[0].bullets[0], "GPA: 3.66/4.0");
  for (const version of [undefined, 15, 16, 17, 18, 19, 20]) {
    const draft = clone(initialResume);
    draft.education[0].bullets = ["GPA: 3.82/4.0", "Custom coursework"];
    draft.education[1].bullets = ["GPA: 3.82/4.0"];
    const expected = clone(draft);
    expected.education[0].bullets[0] = "GPA: 3.66/4.0";
    assert.deepEqual(clone(migrateSavedResume({ resume: draft, contentVersion: version })), expected);
    assert.equal(draft.education[0].bullets[0], "GPA: 3.82/4.0");
  }
  for (const title of ["University of Wisconsin–Madison", "University of Wisconsin-Madison"]) {
    const draft = clone(initialResume);
    draft.education[0].id = "imported-school";
    draft.education[0].title = title;
    draft.education[0].bullets = ["GPA: 3.82/4.0"];
    assert.equal(migrateSavedResume({ resume: draft, contentVersion: 19 }).education[0].bullets[0], "GPA: 3.66/4.0");
  }
  const edited = clone(initialResume);
  edited.education[0].bullets = ["GPA: 3.66/4.0", "Custom coursework"];
  assert.equal(migrateSavedResume({ resume: edited, contentVersion: 19 }), edited);
  edited.education.shift();
  assert.equal(migrateSavedResume({ resume: edited, contentVersion: 19 }), edited);
});

test("versioned JSON round trips preserve inline formatting, links and all custom content", () => {
  const draft = clone(initialResume);
  draft.profile.headline = "**Vision** · [Research](https://example.com)";
  draft.profile.linkedin = "My custom profile";
  draft.education[0].bullets = ["GPA: 3.82/4.0"];
  draft.experience[0].bullets = ["My **Gaussian Splatting** work with [results](https://example.com/results_(2026))."];
  draft.experience[0].date = "My custom date";
  draft.publications[0].subtitle = "Another Author, **Chenghao Jiang**";
  draft.publications[0].location = "A hidden legacy location";
  draft.publications[0].status = "";
  const backup = JSON.parse(serializeResume(draft));
  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.contentVersion, 21);
  const imported = clone(parseResumeImport(backup));
  assert.deepEqual(imported, draft);
  assert.deepEqual(clone(migrateSavedResume({ resume: imported, contentVersion: backup.contentVersion })), draft);
  assert.deepEqual(clone(parseResumeImport(JSON.parse(serializeResume(imported)))), draft);
});

test("explicit old flat imports preserve edits instead of replaying personal-content migrations", () => {
  const draft = clone(initialResume);
  draft.experience[0].bullets = ["Custom reconstruction with **Gaussian Splatting**"];
  draft.experience[1].date = "Custom internship dates";
  draft.education[0].bullets = ["Custom GPA"];
  assert.deepEqual(clone(parseResumeImport(draft)), draft);
  assert.deepEqual(clone(parseResumeImport({ contentVersion: 15, resume: draft })), draft);
});

test("publication status migrates once without exposing or destroying a location", () => {
  const draft = clone(initialResume);
  delete draft.publications[0].status;
  draft.publications[0].location = "Under review";
  const migrated = clone(parseResumeImport(draft));
  assert.equal(migrated.publications[0].status, "Under review");
  assert.equal(migrated.publications[0].location, "Under review");
  assert.equal(draft.publications[0].status, undefined);
  migrated.publications[0].status = "";
  assert.equal(parseResumeImport(migrated).publications[0].status, "");
  assert.equal(migrateSavedResume({ resume: migrated, contentVersion: 21 }).publications[0].status, "");
  draft.publications[0].location = "San Francisco, CA";
  assert.equal(parseResumeImport(draft).publications[0].status, "");
  assert.equal(parseResumeImport(draft).publications[0].location, "San Francisco, CA");
});

test("imports reject malformed data before it replaces a valid draft", () => {
  for (const value of [null, [], {}, { profile: {}, education: [], experience: [] }, { schemaVersion: 2, resume: initialResume }, { contentVersion: "21", resume: initialResume }]) {
    assert.throws(() => parseResumeImport(value));
  }
  for (const mutate of [
    (draft) => { draft.experience[0].bullets = [123]; },
    (draft) => { draft.profile.email = {}; },
    (draft) => { draft.publications[0].status = false; },
    (draft) => { draft.projects = "wrong"; },
  ]) {
    const draft = clone(initialResume);
    mutate(draft);
    assert.throws(() => parseResumeImport(draft));
  }
});

test("legacy imports can omit optional sections and item fields", () => {
  const legacy = { profile: { name: "Test User" }, education: [{ id: "edu", title: "University" }], experience: [] };
  const result = clone(parseResumeImport(legacy));
  assert.deepEqual(result.publications, []);
  assert.deepEqual(result.skills, []);
  assert.deepEqual(result.projects, []);
  assert.deepEqual(result.education[0], { id: "edu", title: "University", subtitle: "", location: "", date: "", bullets: [] });
  assert.equal(result.profile.email, "");
});

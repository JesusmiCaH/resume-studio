import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../app/resume-builder.tsx", import.meta.url), "utf8");
const data = source.slice(source.indexOf("const tabs:"), source.indexOf("export function ResumeBuilder"));
const context = vm.createContext({ templateData: JSON.parse(readFileSync(new URL("../app/resume-template.json", import.meta.url), "utf8")), structuredClone });
vm.runInContext(ts.transpileModule(`${data}\nglobalThis.api = { resumeTemplate, migrateSavedResume, serializeResume, parseResumeImport };`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { resumeTemplate, migrateSavedResume, serializeResume, parseResumeImport } = context.api;
const clone = (value) => JSON.parse(JSON.stringify(value));

test("template uses generic content and independent copies", () => {
  assert.equal(resumeTemplate.profile.name, "Your Name");
  assert.equal(resumeTemplate.education[0].title, "Fill in your education 1");
  assert.doesNotMatch(JSON.stringify(resumeTemplate), /Chenghao|Tommy|Tera|Hopkins|Wisconsin|HKUST/i);
  const first = migrateSavedResume({});
  first.education[0].title = "Custom school";
  assert.equal(migrateSavedResume({}).education[0].title, "Fill in your education 1");
});

test("restoring every historical draft preserves personal content", () => {
  for (const contentVersion of [undefined, 1, 15, 16, 17, 18, 19, 20, 21]) {
    const draft = clone(resumeTemplate);
    draft.profile.linkedin = "https://linkedin.com/in/chenghao-jiang";
    draft.education[0] = { ...draft.education[0], id: "edu-uw", title: "University of Wisconsin–Madison", bullets: ["GPA: 3.82/4.0"] };
    draft.experience[0] = { ...draft.experience[0], id: "exp-tera-researcher", subtitle: "Tera AI", bullets: ["My own description"], date: "My dates" };
    const before = clone(draft);
    assert.deepEqual(clone(migrateSavedResume({ resume: draft, contentVersion })), before);
    assert.deepEqual(draft, before);
  }
});

test("imports and backups preserve variable entry counts and order", () => {
  const draft = clone(resumeTemplate);
  draft.education = Array.from({ length: 5 }, (_, index) => ({ ...draft.education[0], id: `school-${index}`, title: `School ${index}` }));
  draft.experience = Array.from({ length: 7 }, (_, index) => ({ ...draft.experience[0], id: `role-${index}`, subtitle: `Employer ${index}` }));
  assert.deepEqual(clone(parseResumeImport(JSON.parse(serializeResume(draft)))), draft);
  draft.education.reverse();
  draft.experience.splice(2, 1);
  assert.deepEqual(clone(parseResumeImport(draft)), draft);
  draft.education = [];
  draft.experience = [];
  assert.deepEqual(clone(parseResumeImport(draft)), draft);
});

test("versioned JSON round trips preserve inline formatting, links and all custom content", () => {
  const draft = clone(resumeTemplate);
  draft.profile.headline = "**Vision** · [Research](https://example.com)";
  draft.profile.linkedin = "My custom profile";
  draft.education[0].bullets = ["GPA: 3.82/4.0"];
  draft.experience[0].bullets = ["My **Gaussian Splatting** work with [results](https://example.com/results_(2026))."];
  draft.experience[0].date = "My custom date";
  draft.publications[0].subtitle = "Another Author, **Your Name**";
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
  const draft = clone(resumeTemplate);
  draft.experience[0].bullets = ["Custom reconstruction with **Gaussian Splatting**"];
  draft.experience[0].date = "Custom internship dates";
  draft.education[0].bullets = ["Custom GPA"];
  assert.deepEqual(clone(parseResumeImport(draft)), draft);
  assert.deepEqual(clone(parseResumeImport({ contentVersion: 15, resume: draft })), draft);
});

test("publication status migrates once without exposing or destroying a location", () => {
  const draft = clone(resumeTemplate);
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
  for (const value of [null, [], {}, { profile: {}, education: [], experience: [] }, { schemaVersion: 2, resume: resumeTemplate }, { contentVersion: "21", resume: resumeTemplate }]) {
    assert.throws(() => parseResumeImport(value));
  }
  for (const mutate of [
    (draft) => { draft.experience[0].bullets = [123]; },
    (draft) => { draft.profile.email = {}; },
    (draft) => { draft.publications[0].status = false; },
    (draft) => { draft.projects = "wrong"; },
  ]) {
    const draft = clone(resumeTemplate);
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

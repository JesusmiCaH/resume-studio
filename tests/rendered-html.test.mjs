import assert from "node:assert/strict";
import test from "node:test";

const { default: worker } = await import("../dist/server/index.js");

async function render(template, page = "letter") {
  return worker.fetch(
    new Request(`http://localhost/?template=${template}&page=${page}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

for (const template of ["Scholar", "Modern", "Compact"]) {
  for (const page of ["letter", "a4"]) {
    test(`renders Resume Studio and ${template} on ${page}`, async () => {
      const response = await render(template, page);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
      const html = await response.text();
      assert.match(html, /<title>Resume Studio/);
      assert.match(html, new RegExp(`theme-${template.toLowerCase()} page-${page}`));
      assert.match(html, /Bold: Name/);
      assert.match(html, /Insert link: Research focus/);
      assert.match(html, /Fill in your education 1/);
      assert.match(html, /Your organization/);
      assert.match(html, /accept=".json,application\/json"/);
      assert.doesNotMatch(html, /Chenghao|Tera AI|Johns Hopkins|Wisconsin|tommyjiangch/);
      assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);

    });
  }
}

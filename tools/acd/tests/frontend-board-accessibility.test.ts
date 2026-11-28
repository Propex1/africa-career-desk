import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Opportunity } from "../../../src/types/index.ts";

// Render actual TSX through the installed compiler; no browser or new test dependency.
const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(import.meta.dirname, "../../..");
const cache = new Map<string, { exports: Record<string, unknown> }>();
function load(file: string): Record<string, unknown> {
  if (!path.extname(file)) file += fs.existsSync(file + ".tsx") ? ".tsx" : ".ts";
  if (file.endsWith(".json")) return JSON.parse(fs.readFileSync(file, "utf8"));
  if (cache.has(file)) return cache.get(file)!.exports;
  const loadedModule = { exports: {} }; cache.set(file, loadedModule);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }}).outputText;
  const localRequire = (name: string) => name.startsWith("@/") ? load(path.join(root, "src", name.slice(2))) :
    name.startsWith(".") ? load(path.resolve(path.dirname(file), name)) : require(name);
  vm.runInThisContext("(function(require,module,exports){" + code + "\n})", { filename: file })(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const FilterOption = load(path.join(root, "src/components/JobFilterOption.tsx")).default as React.ComponentType<Record<string, unknown>>;
const CareerAreaFilter = load(path.join(root, "src/components/CareerAreaFilter.tsx")).default as React.ComponentType<Record<string, unknown>>;
const CompactJobCard = load(path.join(root, "src/components/CompactJobCard.tsx")).default as React.ComponentType<Record<string, unknown>>;
const render = (component: React.ComponentType<Record<string, unknown>>, props: Record<string, unknown>) => renderToStaticMarkup(React.createElement(component, props));

const job: Opportunity = {
  id: "frontend-fixture", slug: "frontend-fixture", title: "Infrastructure Analyst", company: "Fixture Employer",
  companyInitials: "FE", boardSection: "Jobs", roleType: "Infrastructure & Project Finance", country: "Kenya",
  locationDisplay: "Nairobi, Kenya", summary: "Investment analysis.", applyUrl: "https://example.test/apply",
  sourceUrl: "https://example.test/role", sourceType: "Company website", applyButtonText: "Apply",
  lastChecked: "28 Nov 2026", status: "Active",
};
const proposal = {
  areaId: "private-markets", subcategoryId: "infrastructure-real-assets", status: "proposed", method: "ai-assisted",
  jobFunction: "Impact & ESG", interestTags: ["infrastructure"], rationale: "Investment ESG analysis.",
  sourceUrl: job.sourceUrl, proposedBy: "fixture", proposedAt: "2026-11-28",
} as const;

test("filter options expose native checkboxes and keep counts outside the accessible name", () => {
  const selected = render(FilterOption, { label: "Kenya", count: 12, selected: true, onToggle() {} });
  assert.match(selected, /<label/);
  assert.match(selected, /type="checkbox"/);
  assert.match(selected, /checked=""/);
  assert.match(selected, /aria-hidden="true">12<\/span>/);
  assert.doesNotMatch(selected, /role="option"|aria-selected/);
  const disabled = render(FilterOption, { label: "Empty country", count: 0, selected: false, disabled: true, onToggle() {} });
  assert.match(disabled, /disabled=""/);
  // Clearing a dimension must remain possible even when its overall count is zero.
  const clear = render(FilterOption, { label: "All countries", count: 0, selected: false, onToggle() {} });
  assert.doesNotMatch(clear, /disabled=""/);
  const selectedEmpty = render(FilterOption, { label: "Selected empty country", count: 0, selected: true, onToggle() {} });
  assert.match(selectedEmpty, /checked=""/);
  assert.doesNotMatch(selectedEmpty, /disabled=""/);
});

test("Career Area trigger exposes the selected label without changing filter identity", () => {
  const html = render(CareerAreaFilter, { selected: ["private-markets"], counts: { all: 4, options: {} }, onToggle() {}, onClear() {} });
  assert.match(html, /aria-label="Career Area: Private Markets"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="[^"]+"/);
});

test("pending card classification is explicit in preview and absent from the public card", () => {
  const preview = render(CompactJobCard, { job, today: "2026-11-28", careerPreview: true });
  assert.match(preview, /Awaiting classification/);
  assert.match(preview, /href="\/jobs\/frontend-fixture"/);
  assert.doesNotMatch(render(CompactJobCard, { job, today: "2026-11-28" }), /Awaiting classification/);
});

test("proposed function stays behind preview visibility; approved function renders publicly", () => {
  const draftJob = { ...job, careerClassification: proposal };
  assert.match(render(CompactJobCard, { job: draftJob, today: "2026-11-28", careerPreview: true }), /Impact &amp; ESG/);
  assert.doesNotMatch(render(CompactJobCard, { job: draftJob, today: "2026-11-28" }), /Impact &amp; ESG/);
  const approvedJob = { ...job, careerClassification: { ...proposal, status: "approved", approvedBy: "editor", approvedAt: "2026-11-28" } };
  const publicCard = render(CompactJobCard, { job: approvedJob, today: "2026-11-28" });
  assert.match(publicCard, /Impact &amp; ESG/);
  assert.doesNotMatch(publicCard, /Awaiting classification/);
});


test("mobile filter alignment follows columns after full-width Career Area", () => {
  const board = fs.readFileSync(path.join(root, "src/components/JobsBoard.tsx"), "utf8");
  const grid = board.slice(board.indexOf('<div id="jobs-filters"'), board.indexOf('<select className="jobs-added"'));
  const controls = [...grid.matchAll(/label="(Region|Country|Experience|Language)"|<CareerAreaFilter/g)].map(match => match[1] ?? "Career Area");
  assert.deepEqual(controls, ["Region", "Country", "Career Area", "Experience", "Language"]);
  const css = fs.readFileSync(path.join(root, "src/app/jobs-preview.css"), "utf8");
  assert.match(css, /@media\(max-width:700px\)[\s\S]*?\.jobs-filters>div:nth-child\(2\) \.jobs-filter-menu,\.jobs-filters>div:nth-child\(5\) \.jobs-filter-menu\{left:auto;right:0\}/);
  assert.doesNotMatch(css, /nth-child\(even\) \.jobs-filter-menu/);
  assert.doesNotMatch(css, /nth-child\(5\) \.jobs-filter-menu\{left:0;right:auto\}/);
});

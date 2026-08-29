import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ComparableVacancy } from "./dedupe.ts";

// Deliberately read-only: existing public listings remain outside this workflow.
export function loadExistingOpportunities(root: string): ComparableVacancy[] {
  const source = readFileSync(resolve(root, "src/data/opportunities.ts"), "utf8");
  const blocks = source.split(/\n\s*\{\n/).slice(1);
  const listings: ComparableVacancy[] = [];
  for (const block of blocks) {
    const pick = (field: string) => new RegExp(`${field}:\\s*[\\\"']([^\\\"']+)`).exec(block)?.[1];
    const title = pick("title"); const company = pick("company");
    if (!title || !company) continue;
    const employerId = /afreximbank|african export-import bank|feda/i.test(company) ? "afreximbank" : /pula/i.test(company) ? "pula" : /proparco/i.test(company) ? "proparco" : "other";
    const id = pick("id") ?? title;
    const applyUrl = pick("applyUrl");
    listings.push({ employerId, title, location: pick("locationDisplay"), requisitionId: /\/j\/([^/]+)/i.exec(applyUrl ?? "")?.[1], applyUrl, evidence: pick("summary") ?? pick("aboutRole"), slug: pick("slug"), reference: `existing:${id}` });
  }
  return listings;
}

export function existingMetadata(root: string, reference?: string) {
  if (!reference?.startsWith("existing:")) return undefined;
  const id = reference.slice("existing:".length);
  return loadExistingOpportunities(root).find((listing) => listing.reference === `existing:${id}`);
}

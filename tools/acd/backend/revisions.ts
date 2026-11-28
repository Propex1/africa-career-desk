import { createHash } from "node:crypto";
import type { ClassificationEvidence } from "../../../src/contracts/acd-v2.ts";
import type { Opportunity } from "../../../src/types/index.ts";

/** Hash JSON semantics while retaining array order and distinguishing absent keys from null. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return entry;
    return Object.fromEntries(Object.entries(entry).sort(([left], [right]) => left < right ? -1 : Number(left > right)));
  });
}

export function jsonHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function classificationInput(job: Opportunity) {
  const evidence: ClassificationEvidence = {
    summary: job.summary,
    aboutRole: job.aboutRole ?? "",
    responsibilities: job.responsibilities ?? [],
    requirements: job.requirements ?? [],
  };
  return { id: job.id, title: job.title, company: job.company, roleType: job.roleType, sourceUrl: job.sourceUrl, evidence };
}

export function classificationRevision(job: Opportunity): string {
  return `classification-v1:${jsonHash(classificationInput(job))}`;
}

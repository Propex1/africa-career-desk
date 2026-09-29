import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const BATCH_SIZE = 20;

export interface RegistryEmployer {
  id: string;
  displayName: string;
  aliases: string[];
  inclusionDecision: "Include";
  priority?: string;
  batchId: string;
  geography: string;
  opportunityTypes: string[];
  inclusionRule: string;
  careersUrl?: string;
  atsProvider?: string;
  linkedInCompanyUrl?: string;
  linkedInJobsUrl?: string;
  googleQueries: string[];
  otherVerifiedSources: Array<{ id: string; type: "official_careers" | "other_verified"; url: string; required: boolean; accessMethod: "web_page" }>;
  sourceStatus: string;
  manualReviewNotes: string;
  workbookId?: number;
  workbookSource?: string;
}

interface RegistryFile { batchSize: number; employers: RegistryEmployer[]; sourceWorkbook: string; sourceSheet: string; }

export const employerRegistry = JSON.parse(readFileSync(resolve(import.meta.dirname, "employer-registry.json"), "utf8")) as RegistryFile;

export const batches = [...new Set(employerRegistry.employers.map((employer) => employer.batchId))].map((id, index) => ({
  id,
  sequence: index + 1,
  employerIds: employerRegistry.employers.filter((employer) => employer.batchId === id).map((employer) => employer.id),
}));

export function validateBatches() {
  const assigned = batches.flatMap((batch) => batch.employerIds);
  if (new Set(assigned).size !== employerRegistry.employers.length || assigned.length !== employerRegistry.employers.length) throw new Error("Every included employer must belong to exactly one batch.");
  // Batch 8 has an explicitly approved 23-employer roster; other batches retain the default cap.
  for (const batch of batches) {
    const limit = batch.id === "batch-08" ? 23 : BATCH_SIZE;
    if (batch.employerIds.length < 1 || batch.employerIds.length > limit) throw new Error(`${batch.id} must contain between 1 and ${limit} employers.`);
  }
}

validateBatches();

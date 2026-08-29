import { classify } from "./classifier.ts";
import { collectSource } from "./collectors.ts";
import { AcdDatabase } from "./db.ts";
import { findDuplicates } from "./dedupe.ts";
import { loadExistingOpportunities } from "./existing.ts";
import { sources } from "./registry.ts";

export async function discover(root: string, resume = false) {
  const database = new AcdDatabase(root); const runId = resume ? (database.latestInterruptedRun() ?? database.createRun()) : database.createRun();
  const existing = loadExistingOpportunities(root);
  try {
    for (const source of sources.filter((item) => item.active)) {
      if (database.sourceWasChecked(runId, source.id)) continue;
      let result;
      try { result = await collectSource(source); }
      catch (error) { result = { result: "parser_error" as const, vacancies: [], failureReason: error instanceof Error ? error.message : "Unknown collector error" }; }
      for (const vacancy of result.vacancies) {
        const classification = classify(vacancy);
        const id = database.addVacancy(runId, vacancy, classification);
        const matches = findDuplicates(vacancy, existing);
        database.addDuplicates(id, matches);
        if (matches.some((match) => match.kind === "exact")) database.updateClassification(id, { ...classification, outcome: "existing_duplicate", confidence: 0.98, reasons: [...classification.reasons, "Exact match with an existing ACD listing; do not treat it as a new candidate."], blocking: false });
        else if (matches.length) database.updateClassification(id, { ...classification, outcome: "possible_duplicate", confidence: Math.max(classification.confidence, 0.7), reasons: [...classification.reasons, "Possible duplicate found; reviewer confirmation is required."], blocking: false });
      }
      database.recordCheck(runId, source.id, result.result, result.vacancies.length, result.failureReason, result.manualReviewRequired);
      database.markSourceChecked(source.id);
      console.log(`${source.id}: ${result.result} (${result.vacancies.length} vacancies)`);
    }
    database.completeRun(runId); return runId;
  } finally { database.close(); }
}

export function repairClassifications(root: string, runId: number) {
  const database = new AcdDatabase(root); const existing = loadExistingOpportunities(root);
  try {
    const rows = database.db.prepare("SELECT * FROM vacancies WHERE run_id=? ORDER BY id").all(runId) as Array<Record<string, unknown>>;
    const clear = database.db.prepare("DELETE FROM duplicate_matches WHERE vacancy_id=?");
    const priorDecision = database.db.prepare("SELECT v.id FROM vacancies v JOIN decisions d ON d.vacancy_id=v.id WHERE v.run_id != ? AND v.source_id=? AND v.source_key=? ORDER BY v.run_id DESC LIMIT 1");
    const moveDecision = database.db.prepare("UPDATE decisions SET vacancy_id=? WHERE vacancy_id=? AND NOT EXISTS (SELECT 1 FROM decisions WHERE vacancy_id=?)");
    for (const row of rows) {
      const prior = priorDecision.get(runId, row.source_id, row.source_key) as { id?: number } | undefined;
      if (prior?.id) moveDecision.run(row.id, prior.id, row.id);
      const vacancy = { sourceKey: String(row.source_key), employerId: String(row.employer_id), sourceId: String(row.source_id), title: String(row.title), department: row.department as string | undefined, location: row.location as string | undefined, description: row.description as string | undefined, employmentType: row.employment_type as string | undefined, requisitionId: row.requisition_id as string | undefined, publishedAt: row.published_at as string | undefined, deadline: row.deadline as string | undefined, applyUrl: row.apply_url as string | undefined, sourceUrl: String(row.source_url), sourceType: String(row.source_type), evidence: String(row.evidence), discoveredAt: String(row.discovered_at) };
      const classification = classify(vacancy); const matches = findDuplicates(vacancy, existing); clear.run(row.id); database.addDuplicates(Number(row.id), matches);
      if (matches.some((match) => match.kind === "exact")) database.updateClassification(Number(row.id), { ...classification, outcome: "existing_duplicate", confidence: 0.98, reasons: [...classification.reasons, "Exact match with an existing ACD listing; do not treat it as a new candidate."], blocking: false });
      else if (matches.length) database.updateClassification(Number(row.id), { ...classification, outcome: "possible_duplicate", confidence: Math.max(classification.confidence, 0.7), reasons: [...classification.reasons, "Possible duplicate found; reviewer confirmation is required."], blocking: false });
      else database.updateClassification(Number(row.id), classification);
    }
  } finally { database.close(); }
}

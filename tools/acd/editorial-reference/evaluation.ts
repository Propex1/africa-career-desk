import { isCareerSelection } from "../../../src/data/career-taxonomy.ts";
import type { ScopeRecommendation } from "../../../src/contracts/acd-v2.ts";

export interface EvaluationExample {
  id: string;
  labelAuthority: "owner-confirmed" | "ai-proposed" | "source-history-only" | "synthetic-policy";
  expectedScope?: ScopeRecommendation;
  expectedSelection?: { areaId: string; subcategoryId: string };
}
export interface EvaluationPrediction { id: string; scopeRecommendation: ScopeRecommendation; selection?: { areaId: string; subcategoryId: string }; }

/** Scores confirmed labels only by default. Proposals/history are not self-validating gold. */
export function evaluatePredictions(examples: readonly EvaluationExample[], predictions: readonly EvaluationPrediction[], includeSynthetic = false) {
  const ids = new Set<string>(); for (const row of examples) { if (ids.has(row.id)) throw new Error(`Duplicate example ${row.id}`); ids.add(row.id); }
  const predicted = new Map<string, EvaluationPrediction>();
  for (const row of predictions) { if (predicted.has(row.id)) throw new Error(`Duplicate prediction ${row.id}`); if (!ids.has(row.id)) throw new Error(`Unknown prediction ${row.id}`); predicted.set(row.id, row); }
  let eligible = 0, scopeTotal = 0, scopeCorrect = 0, selectionTotal = 0, selectionCorrect = 0, missing = 0, invalidSelections = 0;
  for (const row of examples) {
    if (row.labelAuthority !== "owner-confirmed" && !(includeSynthetic && row.labelAuthority === "synthetic-policy")) continue;
    if (!row.expectedScope && !row.expectedSelection) continue;
    eligible++;
    const p = predicted.get(row.id); if (!p) missing++;
    if (p?.selection && !isCareerSelection(p.selection)) invalidSelections++;
    if (row.expectedScope) { scopeTotal++; if (p?.scopeRecommendation === row.expectedScope) scopeCorrect++; }
    if (row.expectedSelection) { selectionTotal++; if (p?.selection && isCareerSelection(p.selection) && p.selection.areaId === row.expectedSelection.areaId && p.selection.subcategoryId === row.expectedSelection.subcategoryId) selectionCorrect++; }
  }
  return { eligibleExamples: eligible, excludedUnconfirmed: examples.length - eligible, missingPredictions: missing, invalidSelections, scope: { correct: scopeCorrect, total: scopeTotal, accuracy: scopeTotal ? scopeCorrect / scopeTotal : null }, subcategory: { correct: selectionCorrect, total: selectionTotal, accuracy: selectionTotal ? selectionCorrect / selectionTotal : null } };
}

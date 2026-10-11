import type { Opportunity, VerifiedDeadlineEvidence } from '../types/index.ts';
import type { ConfirmedClosure } from './opportunity-data.ts';
import { hasVerifiedHardDeadline, isIsoCalendarDate } from './opportunity-data.ts';

export interface LifecycleChange {
  jobId: string;
  kind: 'closed' | 'paused' | 'deadline' | 'apply';
  checkedAt: string;
  sourceUrl: string;
  reason: string;
  evidenceHashes: string[];
  value?: string;
  authority?: "employer" | "official_ats";
}
export interface LifecycleData { schemaVersion: 1; events: LifecycleChange[] }

// The only automated data surface. Original editorial records are never rewritten.
export function lifecycleOverrides(input: unknown, records: readonly Opportunity[]) {
  const data = input as LifecycleData;
  if (data?.schemaVersion !== 1 || !Array.isArray(data.events)) throw new Error('Invalid lifecycle data');
  const ids = new Set(records.filter(r => r.boardSection === 'Jobs').map(r => r.id));
  const closures: Record<string, ConfirmedClosure> = {};
  const deadlines: Record<string, VerifiedDeadlineEvidence> = {};
  const fields: Record<string, Partial<Opportunity>> = {};
  for (const e of data.events) {
    if (!ids.has(e.jobId) || !['closed', 'paused', 'deadline', 'apply'].includes(e.kind) ||
        !isIsoCalendarDate(e.checkedAt.slice(0, 10)) || !Number.isFinite(Date.parse(e.checkedAt)) ||
        !e.reason?.trim() || !Array.isArray(e.evidenceHashes) || !e.evidenceHashes.length ||
        !e.evidenceHashes.every(h => /^[a-f0-9]{64}$/.test(h))) throw new Error('Invalid lifecycle evidence');
    const source = new URL(e.sourceUrl);
    if (source.protocol !== 'https:' || source.username || source.password) throw new Error('Invalid lifecycle source');
    if (e.kind === 'closed' || e.kind === 'paused') {
      closures[e.jobId] = { verifiedAt: e.checkedAt.slice(0, 10), evidence: e.sourceUrl,
        reason: (e.kind === 'paused' ? 'Hiring paused, not permanently closed. ' : '') + e.reason };
    } else if (e.kind === 'deadline') {
      const evidence: VerifiedDeadlineEvidence = { deadlineDate: e.value!, verifiedAt: e.checkedAt.slice(0, 10),
        authority: e.authority ?? 'official_ats', sourceUrl: e.sourceUrl, statement: e.reason };
      if (!hasVerifiedHardDeadline(evidence, e.value)) throw new Error('Invalid lifecycle deadline');
      deadlines[e.jobId] = evidence;
      const original = records.find(r => r.id === e.jobId)!;
      fields[e.jobId] = { ...fields[e.jobId], deadlineDisplay: e.value,
        applicationNotes: `Latest employer-verified deadline: ${e.value}. Consult the original posting for its precise cutoff; earlier dates in these historical notes are superseded. ${original.applicationNotes ?? ''}` };
    } else {
      const url = new URL(e.value!);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid replacement');
      fields[e.jobId] = { ...fields[e.jobId], applyUrl: url.href };
    }
  }
  return { closures, deadlines, fields };
}

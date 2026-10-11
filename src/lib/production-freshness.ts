import { createHash } from 'node:crypto';
import type { Opportunity } from '../types/index.ts';
import { getLiveJobs, hasVerifiedHardDeadline } from './opportunity-data.ts';

// No Vercel system environment variables are required. GitHub deployment status
// establishes commit/environment; this fingerprint establishes served content.
export function productionFreshness(records: readonly Opportunity[], builtAt: string) {
  const jobs = getLiveJobs(records).map(j => ({ id: j.id, slug: j.slug, applyUrl: j.applyUrl,
    verifiedDeadline: hasVerifiedHardDeadline(j.verifiedDeadline, j.deadlineDate) ? j.deadlineDate : null })).sort((a,b) => a.id.localeCompare(b.id));
  const removed = records.filter(j => j.boardSection === 'Jobs' && j.publicationStatus === 'removed')
    .map(j => ({ id: j.id, slug: j.slug })).sort((a,b) => a.id.localeCompare(b.id));
  return { schemaVersion: 2, builtAt, projectionDate: builtAt.slice(0, 10), activeJobCount: jobs.length,
    fingerprint: createHash('sha256').update(JSON.stringify({ jobs, removed })).digest('hex'), jobs, removed };
}

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { productionFreshness } from '../../../src/lib/production-freshness.ts';
import { buildOpportunityProjection } from '../../../src/lib/opportunity-data.ts';
import type { Opportunity } from '../../../src/types/index.ts';
const raw={id:'ACD-test',slug:'test',title:'Test',company:'Test',boardSection:'Jobs',locationDisplay:'Test',publishedAt:'2026-09-01'} as Opportunity;
const opts={employerIdByCompany:{},removedJobIds:new Set<string>(),confirmedClosures:{},today:'2026-10-01'};
test('freshness fingerprint reflects public content, independent of build timestamp and Vercel variables',()=>{
  const rows=buildOpportunityProjection([raw],opts),a=productionFreshness(rows,'2026-10-01T01:00:00Z'),b=productionFreshness(rows,'2026-10-02T01:00:00Z');
  assert.equal(a.fingerprint,b.fingerprint);assert.equal(a.activeJobCount,1);
  assert.notEqual(a.fingerprint,productionFreshness([{...rows[0],applyUrl:'https://example.com/new'}],b.builtAt).fingerprint);
  assert.doesNotMatch(JSON.stringify(a),/applicationNotes|credentials|environment/);
});
test('only authoritative deadlines expire at the inclusive UTC calendar-day boundary, preserving records',()=>{
  const verifiedDeadline={deadlineDate:'2026-10-01',verifiedAt:'2026-09-20',authority:'employer' as const,sourceUrl:'https://example.com/job',statement:'Applications close 1 October'};
  const record={...raw,verifiedDeadline};
  assert.equal(productionFreshness(buildOpportunityProjection([record],opts),'2026-10-01').activeJobCount,1);
  const expired=buildOpportunityProjection([record],{...opts,today:'2026-10-02'});
  assert.equal(expired.length,1);assert.equal(expired[0].publishedAt,raw.publishedAt);
  assert.deepEqual(productionFreshness(expired,'2026-10-02').removed,[{id:'ACD-test',slug:'test'}]);
  assert.equal(productionFreshness(buildOpportunityProjection([{...raw,deadlineDisplay:'1 October 2021'}],opts),'2026-10-02').activeJobCount,1);
});
test('workflow has opt-in gates, bounded schedules, shared concurrency and only the update job can write',()=>{
  const y=fs.readFileSync('.github/workflows/production-freshness.yml','utf8');
  assert.match(y,/17 1 \* \* \*/);assert.match(y,/17 3 \* \* 2,5/);
  assert.match(y,/permissions: \{\}/);assert.match(y,/ACD_LIFECYCLE_ENABLED/);assert.match(y,/ACD_LIFECYCLE_WRITES_ENABLED/);
  assert.match(y,/group: acd-production-freshness/);assert.match(y,/cancel-in-progress: false/);
  assert.equal((y.match(/contents: write/g)||[]).length,1);
  assert.doesNotMatch(y.split('  update:')[0],/contents: write|VERCEL_DEPLOY_HOOK_URL/);
  assert.doesNotMatch(y,/^\s+(push|pull_request|pull_request_target):/m);
  assert.ok([...y.matchAll(/^\s+- uses: ([^\s]+)/gm)].every(m=>/@[a-f0-9]{40}$/.test(m[1])));
  assert.match(y,/statuses: write/);assert.match(y,/lock-failure/);assert.match(y,/ACD_LIFECYCLE_MAX_REMOVALS/);assert.match(y,/retention-days: 30/);assert.match(y,/timeout-minutes: 25/);
});

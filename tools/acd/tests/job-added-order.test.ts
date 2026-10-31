import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Opportunity } from '../../../src/types/index.ts';
import { newestJobs, addedWithin } from '../../../src/lib/job-freshness.ts';
import { filterJobsForBoard } from '../../../src/lib/job-filters.ts';
import { EMPTY_JOB_BOARD_FILTERS } from '../../../src/lib/job-board-state.ts';

const job = (id: string, publishedAt?: string, extra: Partial<Opportunity> = {}) => ({id, title:id, company:'Example', boardSection:'Jobs', status:'Active', publishedAt, country:'Kenya', ...extra} as Opportunity);
test('newest first uses original added date only, preserving ties and missing dates', () => {
  const input = [job('old','2026-10-01',{lastChecked:'2026-10-31',deadlineDate:'2026-12-31'}), job('missing'), job('new','2026-10-30'),job('same','2026-10-30'),job('invalid','2026-02-30')];
  const before = structuredClone(input);
  assert.deepEqual(newestJobs(input).map(x=>x.id),['new','same','old','missing','invalid']);
  assert.deepEqual(input,before);
});
test('multi-select filtering and successive 25-job pages preserve newest-first order', () => {
  const input = Array.from({length:80},(_,i)=>job(String(i),`2026-10-${String(1+i%30).padStart(2,'0')}`,{country:i%3?'Kenya':'Morocco',roleType:'Investment Banking & Advisory'}));
  const ordered = newestJobs(input);
  const filtered = filterJobsForBoard(ordered,{...EMPTY_JOB_BOARD_FILTERS,country:['Kenya','Morocco'],roleType:['Investment Banking & Advisory']},'');
  assert.equal(filtered.length,80);
  assert.deepEqual(filtered,newestJobs(filtered));
  assert.deepEqual(filtered.slice(0,50).slice(0,25),filtered.slice(0,25));
  assert.deepEqual([...filtered.slice(0,25),...filtered.slice(25,50)],filtered.slice(0,50));
  assert.deepEqual(filterJobsForBoard(ordered,{...EMPTY_JOB_BOARD_FILTERS,country:['Kenya']},''),ordered.filter(j=>j.country==='Kenya'));
});
test('date-added windows use publication date with UTC calendar boundaries', () => {
  const today='2026-10-31';
  assert.ok(addedWithin(job('today',today),7,today));
  assert.ok(addedWithin(job('six','2026-10-25'),7,today));
  assert.equal(addedWithin(job('seven','2026-10-24'),7,today),false);
  assert.ok(addedWithin(job('thirteen','2026-10-18'),14,today));
  assert.equal(addedWithin(job('fourteen','2026-10-17'),14,today),false);
  assert.equal(addedWithin(job('future','2026-11-01'),14,today),false);
  assert.equal(addedWithin(job('unknown'),14,today),false);
  assert.ok(addedWithin(job('unknown'),0,today));
});

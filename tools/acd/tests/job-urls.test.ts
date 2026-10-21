import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {publicModules} from '../lifecycle/public-data.mjs';
import {buildSitemap, jobPageMetadata} from '../../../src/lib/seo.ts';
import {validateOpportunityRecords} from '../../../src/lib/opportunity-data.ts';
import type {Opportunity} from '../../../src/types/index.ts';

const records: Opportunity[] = publicModules().records;
const live = records.filter(j => j.publicationStatus === 'live');
const aliases: Record<string,string> = JSON.parse(readFileSync('src/data/job-slug-redirects.json','utf8'));

test('public URLs and SEO metadata never expose research draft identifiers', () => {
  assert.ok(live.length > 0);
  assert.equal(new Set(live.map(j => j.slug)).size, live.length);
  for (const job of live) {
    assert.match(job.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!job.slug.startsWith('draft-'));
  }
  const jobs = live.filter(j => j.boardSection === 'Jobs');
  for (const entry of buildSitemap(jobs)) assert.ok(!entry.url.includes('/draft-'));
  for (const job of jobs) assert.ok(!JSON.stringify(jobPageMetadata(job)).includes('/draft-'));
});

test('shared old job URLs map directly to unique canonical jobs, without loops', () => {
  assert.ok(Object.keys(aliases).length > 0);
  assert.equal(new Set(Object.values(aliases)).size, Object.keys(aliases).length);
  for (const [oldSlug, slug] of Object.entries(aliases)) {
    assert.ok(oldSlug.startsWith('draft-'));
    assert.ok(!aliases[slug]);
    assert.equal(records.filter(j => j.slug === slug && j.boardSection === 'Jobs').length, 1);
    assert.ok(!records.some(j => j.slug === oldSlug));
  }
  assert.equal(aliases['draft-ea8985adc2c3d34ee2a063c8b3cacc2263a8fce7baa8cfe29fd3bb521a7b1850'], 'associate-fundraising-and-investor-relations-africa50-casablanca');
});

test('publication guard rejects a new draft URL while preserving removed history', () => {
  const job = {...live[0], slug: 'draft-new-research-identifier'};
  assert.throws(() => validateOpportunityRecords([job]), /readable website slug/);
  assert.doesNotThrow(() => validateOpportunityRecords([{...job, publicationStatus:'removed', lifecycleStatus:'needs_verification'}]));
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {jobDescriptionQuality} from '../../../src/lib/job-description-quality.ts';
test('editorial checks reject duplicated context and truncated source snippets',()=>{
 const result=jobDescriptionQuality({summary:'A useful summary',aboutRole:'A useful summary',responsibilities:['Lead transactions…'],requirements:['CFA','CFA']});
 assert.ok(result.errors.includes('Role context repeats the summary'));
 assert.ok(result.errors.includes('Duplicate requirements'));
 assert.ok(result.errors.includes('Truncated text or placeholder'));
});
test('sparse source content is reported for an explicit exception rather than padded',()=>{
 const result=jobDescriptionQuality({summary:'Source gives limited information.',responsibilities:['Complete a placement.'],requirements:['Five years of relevant experience.']});
 assert.equal(result.errors.length,0);
 assert.ok(result.warnings.includes('Fewer than five evidenced responsibilities'));
 assert.ok(result.warnings.includes('Missing role context'));
});

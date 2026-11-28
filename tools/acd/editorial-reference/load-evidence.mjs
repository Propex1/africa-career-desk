/** Read one exact recovered record after recover.mjs; never changes source or publication state. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const directory = path.dirname(fileURLToPath(import.meta.url));
export function loadReferenceEvidence(id, dataDirectory = directory) {
  const index = JSON.parse(fs.readFileSync(path.join(dataDirectory, 'reference-index.json'), 'utf8'));
  let indexed;
  for (const shard of index.recordShards) {
    indexed = JSON.parse(fs.readFileSync(path.join(dataDirectory, shard), 'utf8')).records.find(row => row.id === id);
    if (indexed) break;
  }
  if (!indexed) throw new Error(`Unknown reference ID: ${id}`);
  const recovered = JSON.parse(fs.readFileSync(path.join(dataDirectory, 'generated/recovered-history.json'), 'utf8'));
  if (recovered.sourceRef !== index.sourceRef) throw new Error('Recovered source base does not match the reference index; rerun recovery at its fixed base.');
  const row = recovered.records.find(item => item.referenceId === id);
  const literals = row?.observations.filter(item => item.payload && typeof item.payload.title === 'string') ?? [];
  const sourceRecord = row?.current ?? literals.at(-1)?.payload;
  if (!sourceRecord) throw new Error(`No recovered source payload for ${id}`);
  const revision = createHash('sha256').update(JSON.stringify(sourceRecord)).digest('hex');
  if (revision !== indexed.sourceRevision) throw new Error(`Source revision mismatch for ${id}; do not evaluate stale evidence.`);
  return {
    id, sourceRef: index.sourceRef, sourceRevision: revision, sourceRecord,
    evidence: {
      summary: typeof sourceRecord.summary === 'string' ? sourceRecord.summary : '',
      aboutRole: typeof sourceRecord.aboutRole === 'string' ? sourceRecord.aboutRole : '',
      responsibilities: Array.isArray(sourceRecord.responsibilities) ? sourceRecord.responsibilities.filter(item => typeof item === 'string') : [],
      requirements: Array.isArray(sourceRecord.requirements) ? sourceRecord.requirements.filter(item => typeof item === 'string') : [],
    },
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node tools/acd/editorial-reference/load-evidence.mjs <reference-id>');
  console.log(JSON.stringify(loadReferenceEvidence(process.argv[2]), null, 2));
}

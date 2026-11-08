import { spawnSync } from 'node:child_process';

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  return result.stdout.trim();
}

// Read-only check against freshly fetched main. Never merges, pushes or deploys.
try {
  const main = git(['rev-parse', '--verify', 'origin/main']);
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', main, 'HEAD']);
  if (ancestor.status !== 0) throw new Error('acd-v2 is missing main commits. Merge the latest origin/main into acd-v2 and revalidate before preview review or release.');
  const metadataOnly = new Set(['src/data/career-taxonomy.ts', 'src/data/job-functions.ts', 'src/data/career-classification-proposals.json', 'src/data/career-classification-review.json']);
  const changes = git(['diff', '--name-only', main, 'HEAD', '--', 'src/data', 'tools/acd/employer-registry.json'])
    .split('\n').filter(path => path && !metadataOnly.has(path)).join('\n');
  if (changes) throw new Error(`Canonical publishing files differ from main; review every difference before release:\n${changes}`);
  console.log(`ACD 2.0 sync check passed: includes main ${main}; canonical publishing files match.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

# Historical editorial reference dataset

This is an offline, review-only research/evaluation package for ACD 2.0. It changes no current job, taxonomy, editorial decision, database, publishing process or production setting. The coordinator owns any later integration into the shared test runner.

## Sources and recovery

The fixed source base is `58a95fa5212a25fd0719a62c33b11c9e7978153e`, including production `c8e3b81`. Recovery scans all 160 commits reachable from that base, not other agent refs. It inspects 145 distinct tracked TypeScript data-source blobs and evaluates historical public data exports with each commit's date. One initial repository commit predates `src/data/opportunities.ts`; that gap is explicit in coverage.json. Static object recovery preserves raw literal values and records unresolved expressions instead of executing them as data.

The recoverable inventory contains **505 stable opportunity IDs**: **451 Jobs** and **54 programme/open-application context records**. **416** remain in the current canonical projection (368 Jobs). **89** are historical-only. **451 IDs** appeared in a historical `JOBS` export. That is a system-projection fact; it does not prove an owner-approved ACD 2.0 label or a historic Vercel deployment. Current closed (207) and removed (276) counts overlap and must not be added together.

The tracked original XLSX files matter: CSV companions omit the `Removed or Review` and `V3 rejected expired` sheets. `historical-workbook-candidates.json` retains **130** source candidates across launch/review sheets, including **41** candidates with removal/review/rejection observations (**78** observations including repeated source history). **87** candidate rows link to an existing canonical ID; these are related observations, not 130 additional unique published vacancies. Review/removal sheets include monitoring leads and programmes as well as individual jobs. “Not in Launch Opportunities” is not automatically an editorial rejection. Four V3 entries record exclusion actions: three `Do not add...` decisions concerning expiry/availability, and one `Skip` decision for insufficient Africa relevance. The literal source decisions and reasons remain unchanged.

All original decision text, reason, workbook path/blob/commit/sheet/row remain separately recoverable. Five relevant unstructured audit-report excerpts are preserved for review, without manufacturing missing duties or attaching an unverified reviewer identity. Missing or inaccessible rejected-history evidence is a gap, not permission to create invented examples. No private monitoring repository/system, external account, credential or local SQLite database is read. Any decisions only held there remain unavailable to this package.

## Files

- `reference-index.json`: immutable base, shard inventory and shared source locator table.
- `reference-records-*.json`: every recovered opportunity, current/historical facts, exact evidence revision, prior classification/review and fresh conservative reassessment.
- `historical-workbook-candidates.json`: original source rows, decisions and new reassessments kept separate.
- `historical-decision-excerpts.json`: unstructured source report evidence, not gold labels.
- `coverage.json`: counts, source gaps and limitations.
- `recover.mjs` / `xlsx_rows.py`: reproducible public-Git and workbook recovery. Python uses only its standard library to read original XLSX data.
- `load-evidence.mjs`: retrieves an exact recovered source record and shared evidence by ID, rejecting stale revisions.
- `build-reference.mjs`: builds the compact reference index and reassessment results.
- `policy.ts`: inspectable, conservative responsibility-based baseline and shared-contract proposal output; no network, LLM, persistence or publication implementation.
- `evaluation.ts`: confirmed-label scoring with explicit denominators, missing predictions, invalid category pairs and duplicate/unknown identity checks.
- `policy-fixtures.json`: 23-category positive and four outside-scope synthetic regression examples, clearly distinct from real vacancies.
- `reference.test.ts`: independent provenance, label-authority, policy and evaluation tests.

Full raw variants and workbook rows are generated under ignored `generated/`; original Git blobs remain immutable and each retained variant points back to path/blob/commit/line. This keeps the versioned reference reviewable without committing repeated full historical source snapshots. Run recovery to inspect the exact underlying responsibilities or fields, not merely a selected excerpt.

## Reassessment and label authority

There is **one explicitly owner-confirmed taxonomy label**, Beltone IR. Its approved classification, author and date remain in `priorClassification` and `confirmedLabel`. Prior AI proposals are preserved separately and are not copied into gold. Historical public inclusion, closure and rejection are source facts rather than current eligibility/subcategory truth.

Every record receives a fresh review-aid reassessment based on available summary, role context and responsibilities; title is excluded from the policy input. Earlier unresolved editorial cases retain their explicit hold. Programme/open-application context is not scored as individual-vacancy gold. Sparse evidence stays unresolved; relevant specialist finance can remain in scope while category fit is unresolved. Expiry does not make an otherwise relevant finance career out of scope. A source verification failure does not become a role-quality rejection. Historical “do not add” decisions remain unchanged even where broader ACD 2.0 might later support a new proposal.

The baseline is **deterministic policy code, not a trained model**. Its proposals are marked unconfirmed review aids. It is intentionally incomplete and may produce false positives/negatives; it must not drive publication or removal. Existing compatible AI labels are stored as prior inputs, never silently treated as correct outputs. Full human review is still needed before expanding the genuine confirmed reference set.

## Evaluation meaning

By default, `evaluatePredictions` scores only `owner-confirmed` examples with explicit expected labels. It excludes `ai-proposed` and `source-history-only` records. Synthetic cases require an explicit opt-in and their result must be reported separately as policy regression coverage, not historical/model accuracy. Missing predictions count against confirmed denominators; invalid parent/child pairs cannot score correctly; unknown/duplicate prediction IDs fail explicitly. Empty confirmed denominators produce null accuracy, not a perfect score.

One confirmed taxonomy example is insufficient to estimate general classification accuracy, category recall or eligibility precision. The 23-category synthetic set verifies wiring/policy boundaries only. It does not establish that all 23 categories have real, owner-confirmed historical examples. The next editorial milestone is review of a balanced genuine sample, including finance leadership, specialist banking, ESG/support functions, retail-sales negatives and the explicitly unresolved cases.

At this fixed base, the review aid produces 258 mapped and 247 unresolved outcomes across all 505 records. These are proposal-output counts, not 258 accepted labels; 54 programme/open-application context records are included in that denominator and remain unresolved. Forty-two records have no recovered responsibility bullets. Scope recommendations are 359 in-scope, 142 needs-review and four outside-future-scope, again unconfirmed review aids rather than publication instructions. Completion verification matched every stored source revision to its recovered payload, checked 123 immutable source-blob locators, and distinguished the one assembled current-projection locator (which intentionally has no single source blob).

## Reproduce and test

From this worktree, using Node 24 with its own locked dependencies and Python 3:

```bash
npm ci --ignore-scripts --no-audit --no-fund
node tools/acd/editorial-reference/recover.mjs
node --experimental-strip-types tools/acd/editorial-reference/build-reference.mjs
node tools/acd/editorial-reference/load-evidence.mjs DRAFT-e770d8631261
node --experimental-strip-types tools/acd/editorial-reference/make-policy-fixtures.mjs
node --experimental-strip-types tools/acd/editorial-reference/reference.test.ts
npx tsc --noEmit
npx eslint tools/acd/editorial-reference/*.ts tools/acd/editorial-reference/*.mjs
npm run acd:test
npm run acd:v2:preflight
```

The generator uses the fixed base by default. Do not casually relabel old source history when refreshing; bump the source base deliberately, preserve prior reference versions and review changed evidence. No public job record is imported or modified by these commands. No scheduler or automatic publisher is created.

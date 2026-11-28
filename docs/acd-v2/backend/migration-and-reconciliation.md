# Migration, historical recovery and operational handoff

This is a proposed staged migration strategy. Nothing here is an executable migration or an instruction to connect to production. Normal publishing on main must continue throughout ACD 2.0 development.

## Authority phases

| Phase | Authoritative published jobs | Allowed target writes | Exit gate |
|---|---|---|---|
| Current development | Existing TypeScript source and approved main changes | None added by this design | Reviewed schema/interfaces and source inventory |
| Local import proof | TypeScript/main | Disposable local/test PostgreSQL only, after separate implementation approval | Lossless import, constraints, audit and rollback tests |
| Shadow comparison | TypeScript/main | Approved non-public shadow import; never another production writer | Reconciliation and permission/restore rehearsals |
| Approved handoff | Explicit source/version chosen by owner | One writer at a time under a reviewed handoff plan | Owner approval, exact source parity and successful public checks |
| PostgreSQL authority | One PostgreSQL production catalogue | Authorised publication service only | Existing publisher/automation cannot remain a competing writer |

The shadow target must be clearly labelled non-authoritative, have no public routing, production write credentials or outbound newsletter side effects, and be disposable until an approved cutover. No hosted shadow environment is provisioned by this PR. Do not introduce dual writes as an expedient migration strategy.

## 1. Inventory and immutable source capture

Record the exact main/acd-v2 commit SHAs, registry version, code projection version, approved dated sources, original bytes/hashes and available local SQLite artifact origin. Retain an inventory of which artifacts/rows are available and which are missing. Inspect SQLite through an approved read-only snapshot/export in a later task; never instantiate the current database constructor, which runs migrations and seeds state. Do not search the private monitoring system or assume that ignored local database files exist.

Export the current `OPPORTUNITIES` projection and the three public section exports, preserving every field, optional-key presence, array order and curated membership/order. Preserve source modules and Git history references separately; a flattened projection does not contain all historical versions or the evidence of every decision. Parse historical source commits without executing arbitrary historical code or applying old migrations to live state.

Inventory existing writers before cutover: manual approved main updates and any currently activated public lifecycle workflow/write gates. Tracked workflow documentation is evidence of capabilities, not proof that live gates are enabled. This design does not inspect or change live automation settings. Any later writer freeze/transfer requires owner approval and a plan that prevents simultaneous TypeScript and database publication.

## 2. Recover historical domains without inventing decisions

- Published, expired, removed and reactivated records retain their public IDs and slugs. Distinct snapshots become revisions with commit/path lineage; records absent from the latest board remain in historical storage.
- Never-published discoveries and rejected candidates retain source identity and origin-scoped SQLite/research references. They are not automatically imported as published Opportunities.
- Import each recoverable SQLite decision exactly as recorded, including action, edited JSON, timestamp and reviewer note. Unknown actor attribution remains unknown/imported. Since the schema holds one decision row per vacancy, missing earlier revisions cannot be reconstructed as facts.
- Retain duplicate relationships, deferred outcomes, explicit expired-finding evidence, source failures and incomplete coverage. A title appearing in a test fixture is not a recovered historical vacancy.
- Keep existing taxonomy reviews and new broader-scope reassessments separate. AI labels are proposed; confirmed current taxonomy labels require traceable explicit human confirmation. Historical publication does not imply that confirmation.

Agent A's historical dataset can feed this inventory using provenance and decision-authority fields. It is a reference/evaluation input, not permission to republish rejected or expired roles. Dataset records without complete responsibilities remain available with an evidence gap.

## 3. Build an idempotent local importer after approval

Import employers/sources, provenance artifacts, Opportunities/revisions/board snapshots, discovery candidates/observations, research lineage, old editorial events/manifests, then taxonomy proposal/review records. Preserve source IDs; namespace only internal SQLite integer keys. Resolve foreign keys using explicit origin maps. Unmatched employer names or references go into a reconciliation queue; do not merge or drop them silently.

Use a source snapshot ID plus artifact hash, entity kind and legacy key as the import idempotency identity. Repeating the same immutable input produces no duplicate rows/events. A changed artifact or payload creates a new version or a visible conflict according to the reviewed rule. Never overwrite prior raw evidence, historical decisions or a newer current revision. Normalised URL hashes may assist duplicate assessment, but original source/Apply strings remain untouched.

Run each import unit transactionally with checkpoint metadata so an interrupted run can resume without partially selected current pointers. Import validation failure stops selection of the new snapshot; keep prior authoritative state readable. Do not continue with a partial published catalogue and report success.

## 4. Reconciliation ledger

For each source snapshot, retain machine-readable comparisons and human-readable exceptions. A visible-count match alone is insufficient.

| Check | Required result |
|---|---|
| Opportunity identity set | Exact ID count/set match, including historical/removed rows; no generated replacements |
| Public URLs | Exact slugs/source/apply URLs and existing redirect mapping; source URLs and derived normalised keys distinguished |
| Original content | Exact strings, optional keys, arrays/order, notes, employer identity/display and section/legacy role values |
| Dates | Exact first-seen, original ACD publication, employer-posting and verified deadline evidence; absent remains absent |
| Lifecycle | Exact publication/lifecycle/reason/closure evidence; no inferred closure from source failure |
| Board output | Exact exported Jobs/Programmes/Open Applications membership and curated order for the same source/as-of inputs |
| Filtering/search | Same fixtures and result IDs/counts for aliases, parent/child, languages, geography, functions/tags, sorting and facets |
| Classification | Proposed/approved/unresolved and scope flags preserved; input revisions/evidence match; no stale proposal selected |
| Discovery history | Origin-key counts/relationships, latest recoverable decision rows, expired findings, duplicate links and import lineage preserved; explicit gaps reported |
| Audit | Original event times/attribution retained where known; import time is separate; no fabricated approvals or history |
| Retry/concurrency | Repeat import/proposal is idempotent; different content under the same key conflicts; stale approval/update denied |
| Visibility | Public output contains no unapproved nested metadata, rejected/raw artifacts or editorial-only information |

Every mismatch is classified as a known source limitation, an importer defect or a proposed intentional behaviour change. The last category needs explicit review; never hide it behind normalisation or a zero-warning summary. Capture hashes and individual IDs so a reviewer can inspect precisely what differs.

## 5. Keep up with main during development

The coordinator continues incorporating approved main commits into acd-v2. Import/shadow comparisons identify new/changed records from the exact source commits and replay them idempotently, retaining original dates and earlier revisions. Changes to duties invalidate old AI input revisions; simple lifecycle changes preserve unchanged classification evidence. Agents do not resolve canonical publishing conflicts independently.

No development branch, fixture dataset or shadow importer writes back into main or resets source data. Continue using the existing approved publishing process until a separately approved handoff. Run the current preflight and existing regression suite against the fresh main snapshot; add database parity tests later rather than removing current guards.

## 6. Handoff and rollback gates

Before a production handoff, the owner must approve the migration/source snapshot, operational roles, credentials, privacy scope, backup/restore procedure, measured recovery objectives, monitoring, rollback trigger and responsible operator. Perform a restore rehearsal in an isolated environment using the exact backup/import format; a successful export is not a tested restore. The required recovery point/time objectives are open operational decisions, not promises made here.

At the approved handoff, stop competing publication writers in a short explicitly agreed window or another reviewed single-writer transfer protocol. Include any already activated lifecycle writer. Capture a final main/version boundary, apply its tail changes, reconcile again, then switch the reader/publication authority once. Keep a change journal for every event accepted after the boundary. No missing job additions or silent publication-date resets are acceptable. This window is a future release decision; it does not restrict routine publishing during development now.

Rollback before accepting database publication writes can return to the exact verified TypeScript snapshot after checking that no newer approved main changes would be lost. Rollback after database writes requires replaying or otherwise preserving all post-cutover approved publication events into the selected fallback; restoring an old Git tree/backup alone would lose new jobs and is not an acceptable rollback. Stop the new writer before fallback, reconcile the journal, obtain the required authorisation and keep one writer. Never reset main, force-push history, delete a database or reopen expired vacancies automatically as a rollback shortcut.

After handoff, verify real production content, route/Apply destinations, sitemap/robots/category behaviour, current board counts/order, access controls and a supervised ordinary job publication. Leave newsletter/analytics settings at their approved values. Retire legacy writes only after verifying the new authority; retain archived history/import evidence under the approved retention plan.

## Deliverable validation versus future acceptance tests

This design can be statically checked for complete Opportunity-field and SQLite-table coverage, internal links, scope and whitespace. It cannot establish SQL validity, migration success, read-model parity, runtime authorisation, performance, backup recovery or production safety before implementation. Those require separately approved local/test code and rehearsals. No database or implementation tests are claimed by this documentation PR.

# Development roadmap

Preparation approved on 28 November 2026. No specialist agents, feature branches, PostgreSQL instance, scheduler, account feature or automatic publisher are created in this step.

## Gate 0 — coordinator preparation

- Incorporate latest main into acd-v2 without production changes; preserve canonical records and ACD 2.0 implementation.
- Establish this specification and contract v1, reusing existing types and taxonomy.
- Run data parity, regression tests, type checks, content checks and preview build.
- Commit preparation to acd-v2. Its existing Git integration may refresh the protected preview; no public release or protection change is authorised.
- Before starting agents, verify access and branch protection, agree task scopes and allocate separate worktrees. GitHub remains the durable record of tasks, reviews and blockers.

## First three parallel workstreams

| Workstream | First deliverable | Ownership | Dependencies / limits |
|---|---|---|---|
| AI classification | Evidence-based reconciliation of current jobs; proposed mappings or explicit holds; evaluation fixtures and stale-evidence tests | Classification proposal/review metadata, AI-specific evaluation code and tests | Uses v1 and approved registry. Can start with file inputs and fixture storage; does not wait for PostgreSQL. No model-driven approvals, publication or taxonomy changes |
| Database/backend | Reviewed PostgreSQL schema/migration design; compatible file-reader and mock interfaces as a later implementation task; documented reconciliation/rollback and permission tests | New backend adapter/design files and backend tests | Uses v1 and existing Opportunity. No hosted resource, production connection, migration or replacement publisher without separate approval. Backend must propose any dependency/schema changes for review |
| Frontend | Responsive board/filter/card improvements and regression coverage using current data or contract fixtures | Board/cards/filter UI, related CSS, frontend-specific tests | Uses v1 and current metadata selectors. Can work with fixtures while backend is designed; does not invent APIs or consume editor-only evidence publicly |

Each deliverable is a small PR into acd-v2. Separate backend design from database provisioning: approving a design PR does not authorise production resources or cutover. UI changes must preserve existing URLs and ordinary publishing throughout.

## File ownership and coordination

The coordinator owns `src/contracts/acd-v2.ts`, `src/types/index.ts`, taxonomy/functions, shared specification, dependencies/lockfile, CI, test runner registration, canonical publishing files and integration wiring. AI owns proposal/review JSON and AI evaluation files; backend owns new storage/adapter files; frontend owns existing board/card/filter components and their presentation logic. Agents propose shared-file changes rather than editing another workstream's files simultaneously. The coordinator registers new tests in `tools/acd/tests/run.ts` and reconciles overlapping changes.

The classification agent must inspect then-current duties; the 114-job workbook is a recommendation input, not an immutable gold label set. Preserve its two proposed function corrections and remaining gaps for review rather than silently assuming all earlier AI mappings are correct. Human-approved classification and publication events remain distinct.

## Dependency and integration sequence

1. All three agents read the same specification/contract and start from the coordinator's synced commit.
2. Classification uses current source snapshots; backend and frontend use contract fixtures. Share questions through task/PR discussions, not undocumented assumptions.
3. Any blocking contract change goes to the coordinator first, with affected examples/tests. All dependent agents update to the reviewed contract revision.
4. Review and merge passing workstream PRs sequentially into acd-v2. Do not merge agent branches directly into each other or main. Rebase/merge remaining feature branches onto the updated integration branch as needed.
5. Run combined checks and review the protected integration preview. Feature-branch previews require separately reviewed preview-only flags/protection; do not copy production secrets into them.
6. Coordinator periodically fetches main and merges approved publishing changes into acd-v2. Reassess source changes, invalidate stale metadata, reconcile identity/history and rerun checks. Agents do not independently resolve canonical publishing conflicts.

## Later gates

| Gate | Exit condition |
|---|---|
| Contract and workflow integration | File/mock adapters, metadata evaluation and frontend agree on identity, visibility, evidence and unresolved cases; current publishing unchanged |
| Local PostgreSQL proof | Separately approved local/test implementation; lossless import and idempotency/concurrency tests pass; no production connections |
| Daily monitoring pilot | Separately approved schedule/source coverage, bounded retries, auditable failures and human review; no automatic publication/removal |
| Production data transition | Owner approves schema, backup/restore, reconciliation, credentials and rollback; one authoritative production writer, no competing production catalogue |
| Candidate/employer features | Separate authentication, consent/retention and submission-review design approved; no public self-publication |
| ACD 2.0 release | Fresh main sync, all checks/preview review, explicit owner approval of merge and production deployment |

## Required completion report per PR

State the task, base/head commits, changed files, behaviour, tests/results, contract compatibility, production/data impact, unresolved evidence and next dependency. Report source failures and blocked work plainly. Agent completion does not equal integration or deployment. The coordinator reports assigned/working/blocked/ready-for-review/integrated status with PR links during an active session; no unattended cross-session monitoring is implied.

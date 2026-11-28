# Agent start briefs — not executed

These instructions are ready for a later explicit start. This preparation does not launch agents, create feature branches/worktrees or open PRs. Use the same synced coordinator commit as the initial base for all three.

## Branches and isolated worktrees

Use a prefix distinct from the existing `acd-v2` branch: Git cannot store both `acd-v2` and `acd-v2/something` as branch refs. These replace the earlier illustrative acd-v2/... names.

| Agent | Proposed branch | Proposed sibling worktree |
|---|---|---|
| AI classification | acd2/ai-classification | acd-agent-classification |
| Backend | acd2/backend-contract | acd-agent-backend |
| Frontend | acd2/frontend-board | acd-agent-frontend |

Example commands for the coordinator **after authorisation to start**, from the existing repository:

```bash
git fetch origin main acd-v2
# Confirm origin/main is included in origin/acd-v2; sync/revalidate first if needed.
git merge-base --is-ancestor origin/main origin/acd-v2
git worktree add -b acd2/ai-classification ../acd-agent-classification origin/acd-v2
git worktree add -b acd2/backend-contract ../acd-agent-backend origin/acd-v2
git worktree add -b acd2/frontend-board ../acd-agent-frontend origin/acd-v2
```

Check that proposed paths/branches do not already contain work before creation. Give each agent its exact absolute worktree path and branch; it must check status and branch before editing. Each agent installs/uses dependencies and runs its own local server on a distinct port if necessary. The existing detached `acd-live` analysis worktree is not an agent workspace. Do not let agents share one mutable checkout, lockfile or local SQLite database.

In this Work session, the coordinator can later delegate three specialist subagents with these paths and briefs. They share the filesystem, so isolation comes from the allocated worktrees. Separate Codex Cloud tasks can use separate checkouts instead; their durable handoff remains the GitHub PR. Starting a subagent here is not proof that an unrelated external Codex chat/task is running.

## Common instruction for every agent

Read AGENTS.md and docs/acd-v2/{README,data-interface,roadmap}.md. Work only in your allocated worktree and feature branch, based on the synced coordinator commit. Preserve pre-existing work. Your PR base is acd-v2. Do not modify main, production settings, published records, job URLs/dates, taxonomy, shared contract, dependencies or CI without coordinator review. No production credentials, migrations, automatic publication/removal or unprotected deployments. Stay within assigned file ownership; propose cross-agent changes through the coordinator. Report your commit/PR, tests, blockers and exact next dependency. Do not assume a passing test authorises publication.

## AI classification start prompt

Act as the ACD AI Classification Agent. Reconcile current source jobs against the seven-area/23-subcategory registry using actual responsibilities. Preserve Beltone IR, substantive strategic finance/FP&A and previous editorial history. Return mapped proposals or explicit unresolved results under contract acd-v2/1, with evidence/revision checks and separate scope recommendations. Use current records and historical audits, not title-only inference or blanket acceptance of the workbook. Own career-classification-proposals.json, career-classification-review.json and new AI evaluation/test files. Do not edit UI, canonical source jobs or shared types/taxonomy. First deliver a bounded reconciliation/evaluation PR; no automatic approval or publishing. You can work against file snapshots while backend is designed.

## Database/backend start prompt

Act as the ACD Backend Agent. Read current TypeScript publishing and local SQLite discovery/review before designing one eventual PostgreSQL production system. Propose a lossless schema/mapping, read/proposal-store adapter boundaries, concurrency/idempotency, audit history, access controls, reconciliation and rollback under acd-v2/1. Own new backend design/adapter files and backend-specific tests. First deliver a design PR; do not provision a database, connect production, run migrations, replace publishing, add dependencies or implement automatic publication. Later adapter implementation needs its own agreed task. Frontend and AI must be able to use fixtures/current file data independently.

## Frontend start prompt

Act as the ACD Frontend Agent. Preserve the nested seven-area/23-child dropdown, Private Markets expanded by default, Job Function metadata, tags, compatibility links and public job lifecycle. Improve/verify mobile/desktop board usability, keyboard accessibility and visible unresolved states using current source data and acd-v2/1 fixtures. Own JobsBoard, CompactJobCard, CareerAreaFilter, related UI/CSS and new frontend-specific tests. Do not change taxonomy, backend/storage, source job records, publication policy or shared interface. Do not expose editorial proposals outside the protected preview. First deliver a bounded usability/verification PR into acd-v2.

## Review and handoff

Each agent reports a ready-for-review PR into acd-v2; none merges itself into main. The coordinator checks changes and required tests, integrates sequentially, updates shared runner/wiring, handles main sync and reviews the combined protected preview. Main release and production migration/deployment remain separately owner-approved actions. Branch protection and scoped permissions must be verified before agent implementation; the briefs are not a substitute for access controls.

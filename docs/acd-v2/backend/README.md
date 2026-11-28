# PostgreSQL and backend design

Design proposal for issue #11, based on coordinator commit `58a95fa5212a25fd0719a62c33b11c9e7978153e`. Contract: `acd-v2/1`; taxonomy: `2026-11-28`.

This deliverable is documentation only. No database, connection, migration, scheduler, backend route, dependency or publishing implementation is created. TypeScript publishing and local SQLite discovery/review continue unchanged. Approval of this design does not authorise a production migration.

## Decision summary

Use one eventual authoritative PostgreSQL production database for the existing ACD product. Retain the existing Opportunity identity and public projection, with separate stores for source observations, discovery candidates, classification proposals, human review events and publication events. Local/test databases are disposable development environments, not competing production catalogues.

Do not equate these facts:

- A vacancy was discovered or historically rejected.
- An opportunity was published or later closed/removed.
- A particular ACD 2.0 mapping was explicitly approved by an identified human.
- An AI proposes that the same vacancy now fits the broader editorial scope.

Historical facts remain unchanged; reassessment creates a new attributable proposal. A rejected discovery need not have a published Opportunity ID. An expired published job remains an Opportunity with its original ID, slug, dates and event history. No imported record is dropped merely because it lacks responsibilities, an employer ID or a current taxonomy fit.

## Repository evidence reviewed

| Source | Design consequence |
|---|---|
| `src/types/index.ts` | Preserve the entire existing Opportunity payload, including optional-field presence and legacy RoleType |
| `src/data/opportunities.ts` and dated approved/availability modules | Import the assembled projection and retain source-file/commit lineage; raw dated rows are not independent new job identities |
| `src/lib/opportunity-data.ts`, job lifecycle/freshness/publication code | Preserve current public visibility, closure evidence, first-publication dates and ordering rather than replacing them with new defaults |
| `src/lib/career-classification.ts` and `src/lib/career-preview.ts` | Separate proposals/approvals, validate current registry pairs and invalidate stale identity/duty evidence |
| `src/contracts/acd-v2.ts` and `docs/acd-v2/data-interface.md` | Keep storage behind the common reader/proposal-store interfaces; no SQL/ORM entities in frontend responses |
| `tools/acd/migrations/001_initial.sql` through `005_research_imports.sql` | Preserve local discovery runs, source checks, candidates, decisions, freshness, batches, imports and publication manifests as a distinct legacy domain |
| `tools/acd/types.ts` and ADR 001 | Discovery eligibility outcomes and review decisions differ from ACD 2.0 taxonomy and public publication state |

Only tracked schemas and repository files were inspected. No SQLite database was opened and no private monitoring system, hosted database, credentials or external account was accessed. Local schema definitions show what may be recoverable, not that historical data rows are currently available. The existing SQLite `decisions` table stores one current row per vacancy; it cannot prove that earlier overwritten decisions still exist. Record such gaps rather than inventing a complete event history.

## Design documents

- [Schema and field mapping](schema-and-mapping.md): entities, keys, constraints and lossless source representation.
- [Migration and reconciliation](migration-and-reconciliation.md): import stages, historical lineage, shadow comparison, cutover and rollback gates.
- [Interfaces and access controls](interfaces-and-access.md): reader/proposal boundaries, revisions, pagination, authority and least privilege.

## Deferred decisions

Hosting/vendor, PostgreSQL version, connection-pooling deployment, authentication provider, ORM/query library, scheduling service, exact monitoring hour, restore objectives and retention periods are not selected here. They require a later implementation/operations decision. Choose them against the reviewed design rather than adding them implicitly through a feature PR.

Candidate accounts, CVs, employer logins and submissions remain deferred. Later account entities must link to existing employer/opportunity identities and add permission/retention design before personal data is collected. No candidate data belongs in the classification input by default.

## First implementation acceptance criteria

After separate authorisation, start with a file-backed reader and fixture-backed proposal store that satisfy the existing common contract without changing public behaviour. Add a local PostgreSQL proof only after schema review. Demonstrate source parity, explicit visibility rules, stale-proposal handling, idempotency conflicts, stable pagination and permission denials. No live database connection or production cutover is a prerequisite for AI/frontend parallel development.

The coordinator retains ownership of shared types, taxonomy, dependencies, CI, test registration and canonical publishing. Implementation PRs must not relax current canonical-data parity checks as a shortcut.

## Validation of this deliverable

Static checks on the four design documents confirmed coverage of all 48 current Opportunity fields and all 17 tables declared by tracked SQLite migrations 001–005; internal document links resolve. Git whitespace and changed-file scope were checked. No SQL, migrations, production read/write operation or backend runtime test was run. Database correctness, permissions, performance and restore guarantees remain unverified until the separately authorised implementation/rehearsal stage.

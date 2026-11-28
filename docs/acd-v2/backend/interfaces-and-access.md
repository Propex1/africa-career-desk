# Interfaces, concurrency and access controls

Design only. The source of the implemented preparation contract remains `src/contracts/acd-v2.ts`; this document does not change it or add endpoints. Coordinator review is required for any common-contract extension.

## Adapter boundary

Keep `OpportunityReader.getById/list` independent of TypeScript, SQLite, PostgreSQL and a particular ORM. The eventual public server calls a reader with a validated query and a server-created audience context. A file adapter can be built and tested first; backend implementation must not block AI/frontend work against current records and fixtures.

`OpportunityReadModel.opportunity` is the existing domain type, preserving identity, optional values and current public content. Internal source observations, imported notes not already public, rejected discoveries and editorial audit payloads do not belong in public JSON. Resolve the selected classification once on the server and keep the envelope and any attached canonical `careerClassification` consistent. A conflict with canonical approved metadata is an explicit review error, not permission for a new AI proposal to overwrite it.

`ClassificationProposalStore.saveProposal` accepts proposals only. It neither approves a mapping nor publishes/removes a vacancy. The future authenticated review service applies a mapping decision; the separately authorised publication service applies publication events. Those services and their transport routes are not created by the design PR.

## Revision and transaction rules

1. The adapter derives `sourceRevision` from the versioned classification input described in the schema design. A model receives/echoes the token and exact evidence, not a write-authorising secret.
2. Proposal persistence checks subject identity and the current input revision, validates the taxonomy version/pair/function and stores immutable evidence/provenance. Stale input is returned as a conflict requiring regeneration/review, not accepted as the latest proposal.
3. Approval checks the authenticated reviewer role, proposal ID, input revision and latest review state in one transaction. It appends a review event and changes the selected mapping pointer only if all match. The server records reviewer identity/time rather than trusting caller-supplied values.
4. Publication checks its own authorisation, current record version and explicit publication decision. It appends the publication event, creates the new Opportunity revision and updates current board membership transactionally. A mapping approval or scope recommendation alone cannot satisfy publication authorisation.
5. A repeated idempotency key with the same actor/operation/request hash returns the same result. The same key with different content raises a conflict. Concurrent equal keys must not create two events. Use unique constraints plus transactional conflict handling rather than check-then-insert without a constraint.

Full Opportunity updates use an internal `record_version`; classification input revisions remain stable for pure lifecycle/display changes that do not alter their input. The implementation must document deterministic canonicalisation, test missing/empty fields and array order, and preserve source bytes separately. No hash scheme should be described as verified until both file and database adapters produce matching results on shared fixtures.

## Read visibility matrix

| Caller | Board records | Classifications | Editorial/raw source data | Writes |
|---|---|---|---|---|
| Public server reader | Current public section membership plus existing publication/lifecycle/deadline rules | Valid approved mapping or absent; unclassified jobs still present | None beyond content already approved for public job display | None |
| Protected preview reader | Current public data or sanitised development snapshot | Valid current proposals/approvals and unresolved indicator | Minimal authorised review information only; not all imported raw artifacts by default | None to production |
| Collector | Approved source configuration and its own run/observations | None required | Its authorised source responses | Observations/check results only |
| AI classifier | Approved classification input snapshots, registry and prior review context where authorised | Proposals only | No candidate CVs, secrets or unrelated source artifacts | Proposal submission only |
| Human editorial reviewer | Relevant source/evidence/history | Approve/reject/request evidence for an exact revision | Authorised review evidence | Review service only; no implicit publication |
| Publication service | Approved publication request plus current source/version | Reads validated selected metadata | Relevant authorisation/event evidence | Explicit job/publication changes only |
| Schema/migration operator | Reviewed migration scope | Not an editorial approver by virtue of DB access | Backup/import artifacts within approved operation | Time-limited operations, separate credentials and audit |

These are future database/service roles, not controls claimed to be installed today. Deny direct base-table writes to browser, preview, collector and model roles. Expose narrowly scoped views/functions where appropriate; a read-only database login is insufficient if it can select every sensitive raw/audit table. Use separate production read/write credentials, keep credentials server-only and never copy write secrets to feature previews. Database owner/migration credentials must not be application credentials. Test effective grants with each actual role, including owner/bypass privileges, before asserting least privilege.

`OpportunityReadContext.audience` is supplied by trusted server code after deployment/authentication checks; a query string or request body cannot grant editorial-preview access. Public responses must not expose unresolved rationales, model provenance or unapproved metadata through the nested Opportunity payload. Redact/omit before serialisation and test the full response, not just the top-level classification field. Do not use a Vercel protection bypass as an alternative to application permission design.

## Query parity and cursors

The file reader must reproduce current exported `JOBS`, `PROGRAMMES` and `OPEN_APPLICATIONS` membership/order, then the existing board's query behaviour. Reuse current alias, filter, search, sort and facet logic as a test oracle. `OpportunityQuery` describes the Jobs board; do not silently interpret it as a multi-section query until a separate section contract is reviewed.

- Resolve/validate `asOfDate` server-side. Preserve the current local-calendar/verified-deadline behaviour; do not convert a display-only deadline into closure proof.
- Validate limits 1–100 and structured filter IDs. Preserve old query/category URLs through the current alias registry, including intentionally broadened legacy theme aliases.
- Keep case-insensitive keyword matching across the same existing fields, including discoverable function/tags/employer type. A new full-text or semantic ranking system requires a separate behaviour change and evaluation.
- Curated order follows stored board ordinal; recent/deadline sorting preserves current tie-breaking and missing-date behaviour. Pagination adds stable identity tie-breakers only where consistent with the source order. No title-only deduplication.
- Compute `total`, facet counts and result rows using the same audience/as-of/snapshot. Preserve the existing facet rule that ignores its own dimension, including the current Career Area/legacy RoleType interaction.
- An opaque cursor binds snapshot ID, query fingerprint, audience, as-of date, sort and last position. It is validated/signed by the server; it is not a raw SQL offset or an authorisation token. Changed/expired snapshots produce a stale-cursor error with a restart instruction, rather than mixing revisions across pages.
- `getById` does not grant historical access to a public caller. Preserve the current public detail route's membership/not-found behaviour; authenticated editorial history is a separate audience operation. Retain old slugs/redirect rules without turning an unlisted record into a newly public page.

## Proposed service errors for coordinator review

The existing TypeScript contract returns promises but does not define transport errors. Proposed stable service error codes are `INVALID_QUERY`, `UNAUTHORISED`, `NOT_FOUND`, `SOURCE_REVISION_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `STALE_CURSOR`, `TEMPORARY_STORAGE_FAILURE` and `UNSUPPORTED_CONTRACT_VERSION`. Public lookup still returns `null` for ordinary absent/ineligible records as specified by the reader contract; do not leak existence of an editorial-only record through a different public error. Transport HTTP mapping, retryability and request IDs should be added in a reviewed interface PR rather than invented independently by frontend/backend.

Storage/source failures must never become an empty successful board or a verified job closure. Monitoring preserves detailed legacy source outcomes alongside the common success/partial/failed/manual outcome; attempts with no findings are distinct from inaccessible/unattempted sources. Daily retry/run locking and schedules are later implementation work, not enabled by accepting this design.

## Contract clarifications requested, not applied

| Topic | Proposed decision | Compatibility |
|---|---|---|
| `sourceRevision` | Use the classification-input revision in read/proposal envelopes; retain a separate internal full-record version for edits | Document semantics and add parity fixtures; no field change needed if coordinator agrees |
| Never-published historical discoveries | Keep source-vacancy identity and reference labels in the historical dataset; later add an explicit subject union only if online classification needs these records | Do not forge Opportunity IDs or change v1 today |
| Historical/public detail access | Public reader preserves current route policy; authorised history may need a distinct interface | No new public route in v1 |
| Errors | Agree a discriminated service error type before wiring APIs | Additive error documentation/type PR, no existing caller changes now |
| Section and facet APIs | Jobs query stays Jobs-specific; future Programmes/Open Applications and exact facet result shapes require explicit contracts | Avoid independently diverging frontend APIs |

## Verification required for later implementation

Use real source fixtures plus synthetic labelled failure cases. Cover absent versus empty values, duplicate IDs/source keys, equal titles with distinct requisitions, date boundaries, main edits after proposal, approval/publication separation, simultaneous idempotent calls, scope recommendations that leave publication untouched, unresolved visible jobs, nested metadata leakage, invalid preview context, cursor tampering/expiry, stable same-day order and inaccessible sources. Tests must check actual service/database behaviour after it exists; static types or this design cannot establish runtime authorisation.

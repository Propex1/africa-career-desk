# Common ACD 2.0 data interface

Contract `acd-v2/1`, taxonomy `2026-11-28`. Type definitions: `src/contracts/acd-v2.ts`. This document and the types define a boundary only: no database adapter, API route, scheduler, model invocation or production publishing path is installed.

## Ownership and compatibility

The coordinator owns this contract, existing Opportunity types, taxonomy IDs and cross-agent changes. Agents propose contract changes in a dedicated PR before relying on them. Use existing `Opportunity`, `CareerClassification`, `CareerAreaId`, `JobFunction`, `JobBoardFilters` and `JobBoardSort`; do not invent a parallel set of job/lifecycle/role enums. Breaking changes increment the contract version, with fixtures and a migration note. Additive changes preserve old callers and retained audits. Bump taxonomy version only with owner approval of a taxonomy change.

## Messages and consumers

| Contract | Producer → consumer | Meaning |
|---|---|---|
| MonitoringSourceResult | Future collector → ingestion/review | Source outcome, raw observations, stable source keys, timestamps, hashes and explicit issues; observations are not published jobs |
| ClassificationProposal | AI agent → future proposal store/editor | Identity, source revision, exact evidence, mapped proposal or unresolved explanation, separate scope recommendation and model provenance |
| ClassificationReview | Authenticated human editor → future review service | Mapping review tied to a proposal and exact source revision; never job publication authorisation |
| OpportunityReadModel | Future file/PostgreSQL adapter → server/frontend | Lossless existing Opportunity plus revision and optional separate classification assessment |
| OpportunityReader / OpportunityPage | Repository boundary → frontend service | Stable snapshot pagination and total; no storage-specific SQL or ORM objects |
| ClassificationProposalStore | Editorial service → future storage | Idempotent proposal persistence only; no publish/remove operation |

## Identity, revisions and evidence

`opportunity.id`, `slug`, source/apply URLs, employer identity and original `publishedAt` remain unchanged. Keep absent optional fields absent on round trip; missing dates are not zero, today or employer-posting dates. Source observations use their employer/ATS key plus source URL for deduplication, not the title alone. Distinct source requisitions can legitimately share a title. Existing jobs without employer IDs remain valid pending evidenced identity reconciliation.

`sourceRevision` is an opaque, adapter-issued concurrency token. A future file adapter must deterministically derive it from the source record/version; a database adapter may use a record version or canonical hash. The AI receives it and echoes it, never generates it. Any stored or reviewed proposal must still match the current identity, revision and `ClassificationEvidence` before use. Revision mismatch produces a visible stale-review outcome; never overwrite newer duties with an old proposal. Existing preview overlays continue using their current identity/evidence checks until a separately reviewed adapter replaces them.

The evidence object exactly mirrors current classification input: summary, aboutRole (empty string when absent), responsibilities and requirements (empty arrays when absent). It is not the full historical job record. Retain full Opportunity/source history separately so evidence normalisation does not erase optional fields, employer notes or application details. Tags and rationale must be supported by this evidence and source URL.

## Decisions are separate

AI output only accepts the `proposed` branch of CareerClassification. An unresolved result has a reason and optional suggested area/function, but no fabricated subcategory. Scope (`in-scope`, `needs-review`, `outside-future-scope`) is advisory. Human mapping review is also separate from publication/lifecycle decisions.

Only an authenticated review service may convert a valid proposal into approved metadata, checking reviewer identity, approval time and current source revision. That service is not implemented here. Persist rejection, evidence requests and superseded proposals as audit events. Preserve the earlier owner-approved Beltone mapping and all publication decisions; do not turn analysis workbook recommendations into blanket approvals.

## Public and preview visibility

The server supplies `OpportunityReadContext`. `editorial-preview` is not a client-selected query mode and must require appropriate deployment protection/authentication. Production must not gain draft visibility from a URL parameter. Public consumers receive only approved classifications; proposed/unresolved editorial evidence and model/source payloads are not exposed as public review data. Jobs lacking an approved classification remain present, subject to the existing publication/lifecycle rules.

Protected previews may show validated proposals and an unresolved indicator. They must label pending metadata accurately and keep unclassified jobs discoverable under All/Awaiting classification. The existing server page remains authoritative for its preview environment gate in this preparation stage. Future adapters must avoid two competing classifications: retain canonical `opportunity.careerClassification` if present, and return the same selected mapping in the envelope; reject or flag conflicts rather than silently overriding approved metadata.

## Query and error behaviour for future adapters

Queries reuse current filters/search/sorts and compatibility aliases. The server validates `limit` (1..100), `asOfDate` and cursor/query consistency. Dates are ISO calendar dates; event timestamps include timezone. Preserve current country/role/category links and filtering semantics, tag/function search, source order for curated ties and ID deduplication. A cursor represents a stable query snapshot; return `snapshotRevision` and refuse stale/mismatched cursors rather than skipping or duplicating records. `total` uses the same visibility/filter criteria before pagination. Closed/removed/deadline-expired jobs follow existing public eligibility; historical lookup remains possible for authorised editorial consumers.

Future adapters should return explicit typed service errors for invalid input, unauthorised access, revision conflict, stale cursor and temporary source/storage failure. The exact transport mapping is a backend deliverable, not an HTTP implementation here. Empty results are distinct from a failed query. Never report source failure as an empty successful collection or a verified closure.

## PostgreSQL mapping and deferred entities

Suggested logical entities: employers/sources, opportunities, source observations, classification proposals, mapping review events, editorial/publication events and monitoring runs/source checks. Preserve legacy TypeScript payloads losslessly alongside normalised query fields as necessary; exact SQL/schema/ORM choice is a backend-agent proposal. Use transactions, unique source keys, idempotency keys and optimistic concurrency. Migration checks compare IDs, slugs, URLs, dates, lifecycle and historical counts, not only visible job totals. Do not create the schema, connect a hosted database or run migrations in coordinator preparation.

Candidate accounts/preferences/saved jobs and verified employer memberships/submissions are deferred entities. They will link to existing opportunity/employer identities and require separate authenticated permissions and personal-data design. The v1 contract intentionally contains no candidate CV or account API.

## Acceptance examples

- AI returns a mapped proposed infrastructure investment role: accepted for review only; it cannot approve or publish itself.
- Sovereign-risk role has a relevant area/function but no accurate child category: unresolved with a reason, still visible; no new subcategory is created.
- Main edits duties after classification: old proposal becomes stale and cannot be approved against the new source revision.
- Source check fails: record failed/partial status and coverage issue; retain existing job state.
- Main adds a job without metadata: the file reader retains it; frontend displays it without a forced category.
- A rerun submits the same idempotency key and identical payload: return the existing proposal. Reusing a key with different content must raise a conflict, not silently succeed.

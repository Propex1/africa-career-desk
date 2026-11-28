# Schema and lossless field mapping

Proposed physical model, not executable DDL. Names below describe tables in a future `acd` schema within the single authoritative production database. Internal event/run keys may be generated UUIDs; existing public Opportunity/employer/source IDs remain text and are never regenerated.

## Core records and versioning

| Table | Principal columns and constraints | Purpose |
|---|---|---|
| `employers` | `id text PK`, `display_name text`, `aliases jsonb`, optional logo/type metadata, `record_version bigint` | Canonical existing employer identities; no guessed merges |
| `sources` | `id text PK`, `employer_id FK`, source type/URL/priority/access method, enabled/required flags, full legacy payload | Approved monitoring sources; source URLs remain original strings |
| `opportunities` | `id text PK`, `slug text UNIQUE`, nullable `employer_id FK`, `record_version bigint`, `current_revision_id FK`, created/import timestamps | Stable identity for every previously published opportunity, including historical/removed records |
| `opportunity_revisions` | `id UUID PK`, `opportunity_id FK`, `revision_number bigint`, `payload jsonb`, `payload_sha256 text`, `classification_input_revision text`, query projection fields, provenance FK; unique opportunity/revision number | Immutable complete Opportunity payload and query projections; changes append a revision |
| `board_snapshots`, `board_memberships` | Snapshot UUID/version, section, source commit/as-of policy, opportunity/revision FK, ordinal; unique snapshot/section/opportunity and snapshot/section/ordinal | Preserve explicit board inclusion and curated order separately from underlying historical records |
| `url_aliases` | Original path PK, destination path, redirect policy, source revision/provenance | Preserve existing reviewed job/category redirects; do not invent public routes for historical discoveries |
| `source_vacancies` | `id UUID PK`, `source_id FK`, exact `source_vacancy_key text`, optional linked opportunity, first/last-seen values, full discovery payload; unique source/key | Discovery identity independent of public Opportunity identity, including never-published rejected vacancies |
| `source_observations` | `id UUID PK`, source-vacancy/source-check FKs, fetch timestamp, source URL, `content_hash`, raw source text and parsed payload, optional response/failure metadata | Immutable evidence snapshots; repeated fetches may share content hashes but are distinct observations |
| `import_artifacts` | `id UUID PK`, repository/commit/path or SQLite origin, exact raw bytes/object location, byte hash, imported time, source timezone/format notes | Verifiable provenance; unavailable artifacts are documented as gaps, not fabricated blobs |
| `legacy_identity_links` | artifact FK, entity kind, legacy key text, destination entity/id; unique origin/entity/legacy key | Lossless links for old integer SQLite IDs, dated imports, references and future reruns |

Keep the complete Opportunity payload rather than reconstructing it from a partial relational schema. JSON preserves absent keys versus explicit `null`; do not normalise missing dates or unknown employer IDs into invented values. JSONB is the semantic payload, not byte-identical source storage: preserve original TypeScript/JSON/SQLite-export bytes separately in `import_artifacts`, with their own hashes. Retain array order, original Unicode strings, display labels and all source notes in the payload. Generated query columns are derived from that payload and can be rebuilt; they are not another independent source of truth.

The current `JOBS` export also applies the explicit `DELETE_CHECK_2026_11_28_ORDER` slug list after the lifecycle projection. Programmes and Open Applications have their own priority/order logic. A generic query over all apparently active Opportunity records is therefore not an adequate replacement for the board exports. Import the board membership/order and test each section against its current exported list, including current detail-route lookup behaviour. A non-listed historical row must not silently reappear because a database query regards it as active.

`record_version` protects edits to any current record. `classification_input_revision` hashes only identity and classification input under a documented, versioned canonicalisation rule: Opportunity ID/title/company/legacy RoleType/source URL plus current summary/aboutRole/responsibilities/requirements. Missing aboutRole/arrays use the existing evidence normalisation for this hash only. Preserve missing-key distinctions in the full payload. A pure publication/lifecycle change should not invalidate unchanged duty evidence; an input identity or duty change must. Keep full-record version and classification input revision distinct. Adapter `sourceRevision` represents the latter consistently in proposals and read models; see the contract clarification in the interface document.

## Classification and editorial history

| Table | Principal columns and constraints | Purpose |
|---|---|---|
| `taxonomy_versions` | version text PK, registry payload/hash, source commit/path, effective metadata | Snapshot of the coordinator-owned registry, not a second independently edited taxonomy |
| `taxonomy_selections` | taxonomy version FK, area ID, child ID, labels; composite PK on version/area/child | Validate one approved parent/child pair for a mapped proposal |
| `classification_proposals` | proposal UUID PK, opportunity/source-vacancy FK, taxonomy version, input revision, evidence/hash, mapped/unresolved result, scope recommendation/reason, model/prompt/actor attribution, created timestamp | Immutable AI or human proposals; no publication status column |
| `classification_review_events` | event UUID PK, proposal FK, input revision, decision, reviewer attribution, reviewed timestamp, reason, optional superseded-event FK | Append-only mapping approval/rejection/evidence requests; revision must still match when applied |
| `classification_selections` | opportunity PK/FK, selected proposal/review IDs, input revision, version | Pointer to the selected valid mapping, updated transactionally; approved and protected-preview selection remain distinct |
| `editorial_events` | event UUID PK, opportunity or discovery-vacancy FK, decision kind, actor attribution, recorded timestamp, optional original decision time, reason/evidence, import provenance | Preserve acceptance/rejection/defer/duplicate/closure/removal/reactivation decisions independently of taxonomy |
| `publication_events` | event UUID PK, opportunity FK, action, authorised human/service actor, expected record version, original publication date where known, before/after revision IDs, provenance | Audit actual publication changes; a mapping approval cannot create this event |
| `idempotency_requests` | operation scope and key composite PK, actor/scope, request hash, result reference, created timestamp | Retry safety; a reused key with different content is a conflict |

The common AI proposal currently addresses an existing Opportunity ID. Historical rejected discoveries can be stored and evaluated under `source_vacancies` without pretending they were published; do not expose a new common API shape until coordinator review. If a later workflow needs AI proposals for never-published discoveries, propose a versioned subject union rather than assigning an `ACD-*` ID prematurely.

Mapped results require one valid area/child pair and one current Job Function; supported tags/employer type are metadata. Unresolved results require a non-empty reason and may carry a suggested area/function, but no fabricated child ID. Review services enforce the existing metadata validator and versioned registry. Function/employer-type definitions are imported from the source registry, not independently maintained database enums.

Preserve original historical decision payloads even when they use a legacy taxonomy or confidence field. An old `approved` discovery decision, Git publication fact or human-readable reviewer note is not automatically a confirmed current taxonomy label. Store attribution as authenticated principal, imported claimed attribution, or unknown, with evidence. Never manufacture a user identity or approval timestamp from a commit import time. New reassessments coexist with old decisions and can explicitly disagree without rewriting history.

Only application-authorised append operations are granted for evidence/review/event tables. This is auditable history, not a claim of tamper-proof storage: owners/admins can alter infrastructure. Backup access, migration privileges, review of administrative actions and external retention of import hashes are part of operational controls.

## Monitoring and discovery workflow

| Table | Principal columns and constraints | Purpose |
|---|---|---|
| `monitoring_runs` | run UUID PK, schedule/import key UNIQUE, status, start/finish times, resumed-from FK, counts and scope payload | Daily cycle identity, resume and coverage |
| `source_checks` | check UUID PK, run/source FKs, attempt number, outcome, timestamps, count/issues/evidence; unique run/source/attempt | Preserve partial/failure/manual checks and retries; no result silently becomes zero successful vacancies |
| `vacancy_freshness` | source-vacancy PK/FK, first seen, last successfully seen, last checked, employer date/deadline, route status, freshness reason, latest observation FK | Current evidence-derived freshness view, with immutable observations behind it |
| `duplicate_assessments` | discovery-vacancy FK, candidate opportunity/vacancy reference, basis/kind, detail, evidence/provenance, timestamp | Duplicate proposals and reviewed resolution; title-only matching does not merge identities |
| `research_batches` | stable batch ID, order/status, raw payload | Preserve existing employer batches and scope |
| `research_batch_employers` | batch/employer composite PK, ordinal, research status/limitations and attribution | Keep batch membership and coverage, without confusing incomplete checks with exclusions |
| `research_imports` | batch run key UNIQUE, monitoring run FK, input artifact/revision and import timestamp | Preserve independently supplied research lineage and idempotent import |
| `publication_manifests` | manifest UUID PK, run FK, original path/content JSON/byte hash, imported/generated time, status | Retain historical manifests; generation is not proof that publication occurred |

## Exact Opportunity field mapping

Every field below remains in `opportunity_revisions.payload` with original values and presence. Promoted query fields are additional derived storage, not replacements.

| Existing fields | Derived storage/use |
|---|---|
| `id`, `slug` | Stable identity/unique public slug; retain URL history through explicit alias events rather than silently renaming |
| `employerId`, `title`, `company`, `companyInitials`, `logoUrl` | Employer FK when evidenced; title/company/logo projection. Preserve historical employer display strings even after canonical employer reconciliation |
| `boardSection`, `roleType`, `careerClassification`, `discoveryThemes` | Current section/legacy role and controlled secondary discovery. Separate v2 mapping selection can be attached only under visibility/revision rules; preserve any canonical approved metadata |
| `experienceBucket`, `city`, `country`, `region`, `locations`, `locationDisplay` | Queryable experience/geography plus the existing structured multi-location union; display text remains verbatim |
| `language`, `languageTags` | Language display plus query tags; no guessed proficiency |
| `deadlineDisplay`, `deadlineDate`, `verifiedDeadline`, `employerPostedAt` | Date projections only from valid existing dates; verified deadline authority/URL/time/statement retained in full; employer-posting date is distinct from ACD publication |
| `workArrangement`, `employmentType`, `employmentTypeDisplay` | Queryable controlled values plus original display string |
| `summary`, `aboutRole`, `responsibilities`, `requirements`, `niceToHave` | Exact public content arrays/order; first four also form current classification evidence |
| `applicationNotes`, `sourceDescription`, `applyUrl`, `sourceUrl`, `sourceType`, `applyButtonText` | Full source/application provenance and user-facing Apply behaviour. Store original URLs separately from any normalised duplicate keys |
| `publishedAt`, `firstSeenAt`, `lastSeenAt`, `lastChecked` | Preserve known dates and original lastChecked display string; new system timestamps are separate fields, not replacements |
| `publicationStatus`, `lifecycleStatus`, `lifecycleReason`, `closureVerifiedAt`, `closureReason`, `closureEvidence`, `status` | Preserve source values. `status: Active` is a legacy field, not proof the job is currently live. Public eligibility still considers publication/lifecycle/deadline rules |

## SQLite source mapping

Never reuse a local SQLite integer as a globally unique PostgreSQL ID without origin namespace. Source origin identifies repository/artifact/hash; origin + legacy table + legacy key is unique.

| SQLite table | Destination / preservation rule |
|---|---|
| `schema_migrations` | Import artifact metadata only; never replay these SQLite migrations on PostgreSQL |
| `employers`, `sources` | Reconcile existing canonical IDs; preserve aliases/full legacy records and conflicts |
| `runs`, `source_checks` | monitoring_runs/source_checks plus legacy ID links; map granular legacy failure outcomes to common success/partial/failed/manual while retaining the original outcome |
| `vacancies` | source_vacancies and source_observations; retain original run/source/key, raw evidence, URLs, department, requisition and original classifier JSON |
| `duplicate_matches` | duplicate_assessments and legacy references, including unmatched external references |
| `decisions` | editorial_events with exact action/edited JSON/time/note. Import the recoverable current row; do not invent overwritten earlier rows |
| `publication_manifests` | publication_manifests; preserve original path and content, with no inference of actual execution |
| `existing_listing_checks` | source-check/lifecycle evidence linked by preserved opportunity_reference; unresolved references remain explicit |
| `vacancy_freshness` | vacancy_freshness and source lineage; first-seen/employer dates retained, no date reset |
| `batches`, `batch_employers`, `employer_research` | research_batches/research_batch_employers; retain ordering, status, limitation/acknowledgement values and manual-follow-up flags |
| `research_imports`, `research_import_lineage` | research_imports plus import_artifacts/legacy_identity_links; preserve result path, source key and missing-fields JSON |
| `research_import_expired_findings` | discovery evidence and editorial historical outcomes with original exclusion/closure text; no invented published ID |

## Constraints and indexes to validate during implementation

- Foreign keys have explicit deletion behaviour. Do not cascade-delete opportunities, proposals, evidence or historical events when employers/sources are disabled. Use disabled/superseded markers; personal-data deletion is a separate future policy.
- Unique original public ID and slug; composite unique source/key and import origin/legacy key. Requisition keys are scoped to source/employer, never global.
- Publication dates are immutable unless a separately reviewed correction event records before/after/evidence. The normal update service cannot rewrite first publication.
- Optimistic updates require expected record version; mapping review additionally matches input revision. Use transactions for event plus current-pointer updates and for idempotent request creation.
- Index public section/publication/lifecycle/deadline, employer, geography, stable curated/publication order and current approved area/child/function. Search indexing must reproduce current case-insensitive keyword semantics before introducing ranking or tokenisation changes.
- Partial failure/rejection/unresolved values remain explicit. A database constraint can validate structural combinations, but source authority and authentic human review still require service-level authorisation and evidence checks.
- Snapshot cursor storage has an expiry and query/as-of binding. Index definitions and search plans are implementation deliverables to benchmark with actual data, not performance claims made by this design.

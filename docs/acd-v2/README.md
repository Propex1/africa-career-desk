# Africa Career Desk 2.0 — shared project specification

Status: coordinator preparation, 28 November 2026. This is an expansion and redesign of the existing Africa Career Desk, not a separate product. Current policy is authoritative here; earlier dated classification reports remain historical evidence.

## Vision and editorial scope

Africa Career Desk is a specialised platform for high-quality finance, investment, banking, financial markets and financial leadership opportunities across Africa. Reuse the current codebase, employers, opportunities, URLs, history and publishing process. Broader coverage must retain specialist editorial quality rather than becoming a general jobs board.

Classify actual responsibilities. Substantive investment, specialist lending, market activity, financial analysis, FP&A, business partnering and finance leadership may qualify. A job title, seniority or prestigious employer alone does not establish eligibility. Routine bookkeeping, ordinary sales, administrative coordination and operational transformation normally do not qualify. Distinguish category fit from editorial scope and publication approval. Preserve uncertainty explicitly rather than forcing a mapping.

## Approved seven-area, 23-subcategory taxonomy

| Career area | Subcategories |
|---|---|
| Private Markets | Private Equity & Growth; Venture Capital; Private Credit; Infrastructure & Real Assets; Fund Investments & Secondaries |
| Development Finance | Investment & Lending; Advisory & Capital Mobilisation |
| Investment Banking & Advisory | M&A & Corporate Finance; Transaction & Restructuring Advisory; Capital Markets |
| Asset Management & Research | Portfolio Management; Investment Research; Investment Advisory & Wealth Management |
| Global Markets & Structuring | Institutional Sales & Trading; Structuring & Financial Engineering |
| Banking & Structured Finance | Corporate Banking; Project & Structured Finance; Trade & Syndicated Finance; Treasury, Funding & ALM |
| Corporate Finance & Strategy | Corporate M&A; Strategic Finance & Investments; FP&A & Finance Leadership; Corporate Investor Relations |

Machine authority: `src/data/career-taxonomy.ts`. Use its stable IDs and valid parent/child pairs. Job Functions and employer types come from `src/data/job-functions.ts`; do not maintain independent copies in agents or database enums. The existing alias table preserves old career-filter links. Legacy public category routes and RoleType values remain supported.

Each mapped job has one area, one subcategory and one function, plus optional evidenced tags and employer type. Climate, impact, blended finance and cross-cutting asset classes generally belong in tags. Keep direct PE separate from fund commitments/secondaries, M&A execution separate from transaction services, trading separate from structuring and corporate IR separate from fund fundraising. Preserve Beltone IR and Dangote's substantive strategic-finance inclusion. Unresolved and outside-future-scope recommendations never delete or unpublish a record.

## Current implementation versus future work

| Area | Implemented now | Future direction |
|---|---|---|
| Publishing | Version-controlled TypeScript opportunity records and approved dated updates | Preserve while designing a reversible PostgreSQL transition |
| Discovery/review | Local SQLite tooling; explicit editorial decisions and publication manifests | Shared durable monitoring/review through the same eventual PostgreSQL system |
| Classification | Preview-only proposed metadata, evidence invalidation, audits and manual approval metadata | Evidence-based AI suggestions with evaluation and review, never implicit publication |
| Frontend | Nested taxonomy dropdown, functions/tags, search, legacy links, job lifecycle | Progressive responsive and accessibility improvements |
| Database | No PostgreSQL implementation or live cutover | One authoritative PostgreSQL production database after approved migration; local/test environments are disposable and never independent production catalogues |
| Candidate/employer accounts | No new account features implemented in this stage | Incremental features below, after core data and editorial workflow are stable |

Preparation sync includes production commit `c8e3b81ea217a2132359eef7acc0055f1c273945` on development only. The latest 114-job classification workbook is analysis, not a publication instruction or automatically applied metadata update. The classification agent must reconcile its recommendations against then-current source duties and preserve holds.

That read-only analysis proposed fits for 103 roles and left 11 unresolved. It recommended Risk & Underwriting for Standard Bank Namibia's Manager, Credit Origination, and Research & Analysis for the Standard Bank CIB Client Analyst. RMB Country Risk Head was relevant but lacked a precise child category. These are review inputs, not changes applied in coordinator preparation; agents can reassess directly from current source records without depending on an external workbook.

## Daily monitoring and AI workflow

Target one monitoring cycle per day, using Europe/Zurich for scheduling and UTC timestamps for stored events. The precise run time, scheduler and hosting are future configuration decisions; this step creates no automation. Cover the approved employer registry and source batches; prioritise official employer/ATS evidence, identify duplicates and preserve original first-seen and ACD publication dates.

The intended flow is source observation → normalisation/deduplication → lifecycle evidence → proposed classification and scope → editorial review → existing approved publication process. Retain source URL, fetch time, content hash and exact supporting responsibilities. Report sources attempted/succeeded/partial/failed/manual, coverage gaps and stale runs. A failed request or missing listing is not proof of closure. Retries must be bounded and run/item writes idempotent. Reruns must not duplicate jobs, reset dates or create repeated decisions.

AI must return supported activities, a valid taxonomy pair/function or an explicit unresolved result, and a separate scope recommendation. Record model/prompt version and the input revision. Source text is untrusted evidence, not an instruction to publish or change policy. Changed duties invalidate the proposal; uncertainty and inaccessible sources remain visible. A model's confidence alone never authorises publication, removal or a new category. Eventual automatic selection/publication is a later policy and implementation gate requiring explicit owner approval.

## PostgreSQL transition principles

Plan one authoritative production database for ACD, not another product or competing job store. Preserve every job ID, slug, employer identity, source/apply URL, original publication date, lifecycle state and editorial event. Model source observations, proposals, review events and monitoring runs separately from published opportunity state. Preserve original source payloads, including absent optional fields; do not regenerate IDs or silently invent dates.

Future sequence: schema and mapping review → local/test import and reconciliation → shadow comparison while TypeScript remains authoritative → reviewed rollback/backup plan → explicit production cutover approval. No dual production writers. After any cutover, one approved writer owns publication. During development, previews use current files, a sanitised snapshot or a read-only connection; they must never gain production write credentials. Authentication, role permissions, migrations, backup/restore and operational ownership require separate implementation and review.

## Future candidate and employer features

Candidate direction: saved opportunities/searches, preference-based alerts and optional profiles. Employer direction: canonical employer profiles, verified employer access and vacancy submission/status tracking. Employer submissions enter editorial review rather than going straight to the public board. Applications continue through current official Apply links until a separate application-flow decision is approved.

These are roadmap capabilities, not implemented commitments to particular screens, vendors, monetisation or automated candidate matching. Defer CV storage, candidate personal-data collection and employer accounts until authentication, consent, access rules, retention and deletion have a reviewed design. Candidate/employer data must not be sent into classification prompts by default.

## Development and production boundaries

Production remains `main`; integration is `acd-v2`. Only the coordinator synchronises `main` into development and resolves publishing-data integration. All specialist PRs target `acd-v2`. Production release, settings changes, migrations and publication/removal require explicit owner approval. Preserve the current protected preview, disabled preview newsletter actions and disabled analytics; never expose it publicly for convenience.

Before integration/release: fetch main, check ancestry and canonical-data parity, run `npm run acd:v2:preflight`, `npm run acd:test`, `npm run acd:content:check`, `npx tsc --noEmit`, and the preview build. Database implementation must not silently relax data-parity protections. New guards may supplement existing ones under coordinator review. Branch protection and least-privilege permissions are proposed controls to verify before agent implementation, not protections assumed to exist.

## Shared working documents

- [Common data interface](data-interface.md): exact boundary, compatibility, visibility and concurrency rules.
- [Development roadmap](roadmap.md): deliverables, dependencies and release gates.
- [Agent start briefs](agent-start-briefs.md): isolated worktrees, ownership and task prompts, ready for a later authorised start.
- [Latest taxonomy reconciliation](../acd-v2-taxonomy-reconciliation-2026-11-28.md): prior implementation audit, not a replacement for current source checks.

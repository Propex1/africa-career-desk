# Batch 2C — verified deadline evidence correction

Review date: 27 September 2026. Base HEAD: `0f247b5770cdd15a1651b048048923184588cdf2`.

## A–B. Evidence and superseding-source review

Saved authoritative evidence was reviewed first. Current official sources were then checked with direct HTTP requests and, for the JavaScript-driven RMB/IDC pages, an existing headless browser. No forms were submitted. Domain-restricted searches were used only to look for superseding official evidence; no aggregator supplied removal authority.

| ID | Role / employer | Saved authoritative evidence | Current official-source result | Decision |
|---|---|---|---|---|
| ACD-0281 | Head of Special Assets — PIDG | Saved 23 September retained-SRI page gives an explicit application-form cutoff of 24 September 2026 at 23:59 GMT+1 and confirms its exclusive mandate; PIDG's employer advert repeats it. | Employer LinkedIn advert retrieved in this audit retains the cutoff. SRI returns HTTP 404. Retrieved research-tool content can be cached. | Use employer-backed verified deadline, not the 404 as closure proof. |
| ACD-0269 | TWC Transactor — RMB | Official Workday R53657 capture from 20 September explicitly excludes applications on 26 September or afterwards. | Browser shows the role page does not exist; public data endpoint returns 403. Indexed official advert still carries the original exclusive cutoff. | Use saved verified deadline; current unavailability alone is not a confirmed closure. |
| ACD-0275 | Business Analyst — IDC | IDC00806 / job 16969: posting end date 26 September, with role-specific validThrough 2026-09-26T23:59:59+02:00. | Exact job URL explicitly states the posting has already expired; checked at 10:55:33 UTC on 27 September. | Preserve deadline evidence and use the stronger explicit closure. |
| ACD-0277 | Regional Manager — Mpumalanga — IDC | IDC00813 / job 16942: its own posting and structured data give the same date and +02:00 boundary. | Exact job URL explicitly states the posting has already expired; checked at 10:55:32 UTC on 27 September. | Preserve this requisition's deadline and explicit closure evidence. |
| ACD-0278 | Dealmaker — Agro — IDC | IDC00812 / job 16928: its own posting and structured data give the same date and +02:00 boundary. | Exact job URL explicitly states the posting has already expired; checked at 10:55:32 UTC on 27 September. | Preserve this requisition's deadline and explicit closure evidence. |

No superseding extension or reposting was found in the reviewed official sources. This is not a claim of exhaustive absence where source content is unavailable. The three IDC pages positively confirm expiry. PIDG/RMB rely on their explicit, authoritative saved deadlines with no discovered superseding evidence; their inaccessible pages are not independent closure authority.

The [structured evidence ledger](2026-09-27-batch2c-deadlines.json) records exact role-specific URLs, before/after state, saved-source references and SHA-256 hashes, current browser observations and provenance. Existing archived evidence was read but not modified. New raw HTTP/browser captures are in the temporary folder `C:/Users/Armel/AppData/Local/Temp/acd-batch2c-evidence-mJetBO`; durable observations and hashes are preserved in the ledger.

## C–D. Exact changes and boundary representation

Only `VERIFIED_HARD_DEADLINES` and `CONFIRMED_CLOSURES` were extended in the opportunity data module. No IDs were added to `REMOVED_JOB_IDS`. No lifecycle parser, projection engine, SEO filter, display helper or route implementation was changed.

| ID | verifiedDeadline.deadlineDate | Authority | Resulting reason |
|---|---|---|---|
| ACD-0281 | 2026-09-24 | employer — PIDG employer advert 4458988023 | deadline_passed |
| ACD-0269 | 2026-09-25 | official_ats — FirstRand R53657 | deadline_passed |
| ACD-0275 | 2026-09-26 | official_ats — IDC00806 / 16969 | verified_closed |
| ACD-0277 | 2026-09-26 | official_ats — IDC00813 / 16942 | verified_closed |
| ACD-0278 | 2026-09-26 | official_ats — IDC00812 / 16928 | verified_closed |

All five records have reviewed provenance dated 27 September. For saved captures this is the date of evidence review, not a claim that a fresh application body was accessible that day. Each IDC record also has its own `closureVerifiedAt`, `closureReason` and `closureEvidence`; the existing closure override takes precedence while retaining its verifiedDeadline.

RMB's original display remains **Before 26 Sep 2026**. Because the existing engine models inclusive last-eligible calendar days, its verified deadline is **25 September**, and projection excludes it starting **26 September**. It is not converted to apply-by-26-September. No source timezone is supplied or guessed.

PIDG's 23:59 GMT+1 cutoff is preserved verbatim in provenance, including the equivalent 22:59 UTC minute. IDC's exact `2026-09-26T23:59:59+02:00` values are retained separately for each role. **The existing engine remains date-granular and UTC-based.** Retaining precise source evidence does not add timestamp-aware intraday expiry. On the original cutoff day, that date-only convention can lag timezone-specific cutoffs; this batch does not claim otherwise. All five are unambiguously past on the review date, and IDC additionally has explicit current closure confirmation. No different employer closing time has been invented.

## E–H. Inventory and category results

All five reviewed IDs became non-live; none was retained. The result was calculated after source review and projection, not assumed in advance.

| Inventory | Before | After |
|---|---:|---:|
| Live Jobs | 71 | 66 |
| Programmes | 10 | 10 |
| Open Applications | 14 | 14 |
| Historical opportunity records | 168 | 168 |
| Enabled category pages | 5 | 5 |

| Category | Before | After |
|---|---:|---:|
| Private Equity / VC / Private Credit | 5 | 5 |
| Development Finance & Multilaterals | 7 | 4 |
| Infrastructure & Project Finance | 18 | 17 |
| Investment Banking & Advisory | 14 | 13 |
| Climate & Impact Investing | 7 | 7 |

## I. Historical integrity

All five remain in `OPPORTUNITIES` with their original stable ID, slug, employer identity, primary category, role copy, application/source links, original deadlineDisplay, publication dates and application instructions. Only provenance and derived lifecycle fields changed. Their statuses are `publicationStatus: removed` and `lifecycleStatus: closed`. This is historical retention, not deletion.

Record-by-record SHA-256 comparison found exactly these five changed records. The other **163 historical records are identical** to the pre-correction state evaluated on the same date. The surviving live-ID order is preserved. Programmes and Open Applications are unchanged.

## J. Shared public/SEO behavior

The existing JOBS projection drives every exclusion:

- Homepage: 66 unique job-detail links; none of the five removed slugs.
- Categories: matching counts above, with no removed role linked.
- Sitemap: 75 URLs (66 Jobs + four core routes + five categories), down from 80; none of the removed slugs.
- JobPosting: all five historical records return null from the shared eligibility function.
- Public detail routes: HTTP 404, noindex and no JobPosting markup for each removed slug, following existing behavior.
- No separate SEO removal logic or replacement pages.

The updated local production preview runs at [127.0.0.1:3100](http://127.0.0.1:3100/).

## K–M. Files, checks and preservation

Batch 2C changes exactly four files:

1. `src/data/opportunities.ts` — five verified-deadline records and three official IDC closure records.
2. `tools/acd/tests/opportunity-data.test.ts` — updated inventory assertions and four focused regression tests.
3. `docs/audits/2026-09-27-batch2c-deadlines.json` — machine-readable evidence ledger.
4. `docs/audits/2026-09-27-batch2c-review.md` — this report.

Validation passed:

- `npm run acd:test`: 79 tests, zero failures. Includes the existing user-owned research-tooling tests and four new Batch 2C tests.
- Explicit TypeScript `--noEmit --incremental false`.
- Lint of tracked TS/TSX/MJS sources and accepted Batch 2B additions; ignored runtime evidence excluded.
- Production build: 83 generated pages, five fewer than Batch 2B.
- `git diff --check`.
- HTTP verification of all five removed detail routes, the homepage, sitemap and all five category pages.
- Regression coverage for each requisition's evidence, inclusive/exclusive calendar-date boundaries, historical preservation, only-five-record impact, live/sitemap/category exclusion and JobPosting suppression. The IDC deadline-boundary tests isolate deadline evidence from the newer explicit closure override.

All seven accepted Batch 2B files remain byte-identical, including improved H1s/intros/metadata, deadline presentation, tests and its audit. Layout, All Jobs sizing and positioning are unchanged. All 31 unrelated local research/import/review changes remain byte-identical. Git HEAD and index are unchanged. No staging, commit, push, deployment or Batch 3 activation occurred.

## N. Recommendation

Yes: the five evidenced stale listings have been resolved, and this inventory is clean enough to proceed with the separately reviewed secondary-discovery design. No remaining live display is already past on 27 September. This is a scoped data-integrity result, not a new certification that all 66 external application endpoints are open. Seven future-looking/unparsed displays still carry needs_verification under the accepted conservative policy; do not erase those flags or treat discovery themes as editorial approval.

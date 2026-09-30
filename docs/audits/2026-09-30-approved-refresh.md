# Approved 30 September 2026 opportunity refresh

Implemented on 1 October 2026, Europe/Zurich. The user subsequently authorized R53633 restoration, a refresh-only commit, push to main and production deployment through the existing Vercel workflow.

## Scope and evidence

Only the eight explicitly approved Batch 3–6 additions and seven approved removals were implemented. None of the additions was already present or definitively closed. The restoration reuses ACD-0270; no duplicate record is added. IDs ACD-0314 through ACD-0321 extend the existing sequence. First-publication dates reflect implementation on 1 October, not the approval date.

Official pages were checked directly on 1 October local time (30 September UTC). EBRD and Nedbank returned HTTP 200, matching title/location, future deadlines and Apply links. Partech Workable returned `state: published`; its application form was rendered successfully. Absa Workday returned `canApply: true`, `posted: true`, Sandton, and 7 October 2026. Standard Bank's own rendered page matched SmartRecruiters ID 744000152172129 and linked to its corresponding ATS application.

Saved raw sources, rendered source checks, baseline/after inventories, screenshots and validation logs are in the ignored local evidence directory `data/acd-runtime/publication-previews/approved-refresh-2026-09-30/`. `artifact-manifest.json` lists its files.

## Additions

All detail routes have the prefix `/jobs/` and trailing slash. All are Jobs.

| ID | Employer / title | Location | Verified deadline | Slug |
| --- | --- | --- | --- | --- |
| ACD-0314 | EBRD — Associate Banker, SME F&D | Abidjan, Côte d'Ivoire | 12 Oct 2026 | associate-banker-sme-finance-development-ebrd-abidjan |
| ACD-0315 | EBRD — Analyst, Banking SME F&D | Nairobi, Kenya | 12 Oct 2026 | analyst-banking-sme-finance-development-ebrd-nairobi |
| ACD-0316 | EBRD — Analyst, ASB | Cotonou, Benin | 13 Oct 2026 | analyst-asb-ebrd-cotonou |
| ACD-0317 | Partech Africa — Investment Analyst Intern — January 2027 | Nairobi, Kenya or Lagos, Nigeria | Not stated | investment-analyst-intern-january-2027-partech-africa-nairobi-lagos |
| ACD-0318 | Standard Bank — Senior Vice President, Real Estate, Client Coverage | Johannesburg, South Africa | Not stated | senior-vice-president-real-estate-client-coverage-standard-bank-johannesburg |
| ACD-0319 | Nedbank — Associate Principal: Specialised Finance | Johannesburg, South Africa | 5 Oct 2026 | associate-principal-specialised-finance-nedbank-johannesburg |
| ACD-0320 | Nedbank — Principal: Specialised Finance | Johannesburg, South Africa | 5 Oct 2026 | principal-specialised-finance-nedbank-johannesburg |
| ACD-0321 | Absa — Capital Management Analyst | Sandton, Johannesburg, South Africa | 7 Oct 2026 | capital-management-analyst-absa-sandton |

Final Apply URLs:

- ACD-0314: https://jobs.ebrd.com/job/Abidjan-Associate-Banker%2C-SME-F%26D/1397868933/
- ACD-0315: https://jobs.ebrd.com/job/Nairobi-Analyst%2C-Banking-SME-F%26D/1397861533/
- ACD-0316: https://jobs.ebrd.com/job/Cotonou-Analyst%2C-ASB/1421311533/
- ACD-0317: https://apply.workable.com/partechpartners/j/CA18A7180D/apply/
- ACD-0318: https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=744000152172129
- ACD-0319: https://jobs.nedbank.co.za/job/Johannesburg-Associate-Principal-Specialised-Finance/1441982433/
- ACD-0320: https://jobs.nedbank.co.za/job/Johannesburg-Principal-Specialised-Finance/1391868833/
- ACD-0321: https://absa.wd3.myworkdayjobs.com/en-US/ABSAcareersite/job/Sandton/Capital-Management-Analyst_R-15991349-1

Partech remains one internship with two structured city locations. Existing country-page membership recognises Kenya and Nigeria; no new country route was enabled. The existing board uses the compound country label `Kenya / Nigeria`, consistent with its legacy multi-country convention. Its orange symbol is copied from the official Partech homepage's home-link SVG, without alteration. Other employer logos are reused.

Nedbank's pages retain different titles, leadership levels, experience requirements (6–8 versus 8–12 years) and URLs. Both include requisition 145920 in their body; the Associate Principal header additionally displays 147842. Both approved records are retained without asserting a potentially ambiguous requisition number in the listing.

Standard Bank's Client Coverage vacancy remains separate from ACD-0298 Real Estate Finance. EBRD Cotonou remains separate from historical Dakar ASB ACD-0199. Canonical employer IDs are reused; Partech Africa and Absa display aliases were added to the existing public identity map. The employer registry itself was not changed.

## Removals and preserved history

| ID | Employer / title | Result |
| --- | --- | --- |
| ACD-0227 | Enza Capital — Investment Associate | Already automatically removed by verified 28 September deadline; `deadline_passed` retained. |
| ACD-0228 | Enza Capital — Investment Principal | Already automatically removed by verified 28 September deadline; `deadline_passed` retained. |
| ACD-0270 | RMB — Transactor: Debt and Trade Solutions | Explicit editorial removal; `manual_removal`, `needs_verification`. Fresh rendered page and API show 5 October 2026, with applications required **before** that date. The historical record retains its earlier 29 September cutoff. See recheck below; no reactivation. |
| ACD-0282 | RMB — Transactor Team Lead: Broader Africa | Explicit editorial removal; `manual_removal`, `needs_verification`. Fresh browser page says the page does not exist; detail API returns HTTP 403. Earlier saved 30 September cutoff remains intact. |
| ACD-0283 | RMB — Transactor Team Lead: Resources Sector Solutions (RSS) | Explicit editorial removal; `manual_removal`, `needs_verification`. Fresh browser page says the page does not exist; detail API returns HTTP 403. Earlier saved 30 September cutoff remains intact. |
| ACD-0242 | Nedbank — Sector Lead: Diversified Industrials | Already removed; now `verified_closed`, with current official closure evidence. |
| ACD-0244 | Old Mutual Investment Group Namibia — Portfolio Manager (OMAO) | Already removed in the approved 24 September expiry removal; existing `manual_removal` and saved 23 September deadline retained unchanged. |

All seven original records, IDs, slugs, Apply URLs and publication history remain in the inventory; six are removed and R53633 is restored. No closure dates were invented. No lifecycle schema was changed. No approved addition required `approved_but_closed_before_implementation`.

### RMB-only evidence recheck — 1 October 2026, 01:20–01:21 Europe/Zurich

The user reported a current R53633 end date of 29 September, matching the older saved ACD record. A fresh browser context with a no-cache request and a separate direct API request were used to check the exact requisition again. The response evidence is saved separately; the earlier source files were not overwritten.

- **R53633:** [official vacancy](https://firstrand.wd3.myworkdayjobs.com/en-US/FRB/job/Johannesburg/Transactor--Debt-and-Trade-Solutions_R53633) renders `End Date: October 5, 2026`. Its job-detail API confirms requisition `R53633`, `endDate: 2026-10-05`, `canApply: true` and `posted: true`. The employer's closing-date note excludes applications on the stated date and afterwards. Therefore the previous report's wording **“through 5 October” was wrong**: the currently displayed cutoff is **before 5 October**. The current 29 September display could not be reproduced. This does not establish when or why the employer date changed, and the historical 29 September cutoff is not overwritten.
- **R53755:** [official vacancy](https://firstrand.wd3.myworkdayjobs.com/en-US/FRB/job/Johannesburg/Transactor-Team-Lead--Broader-Africa_R53755) serves an HTTP 200 page shell whose rendered content says the page does not exist. Its detail API returns HTTP 403 / permission denied. This is not an accessible active vacancy. The previously saved cutoff is before 30 September; a fresh closing date cannot be recovered from the unavailable page.
- **R53753:** [official vacancy](https://firstrand.wd3.myworkdayjobs.com/en-US/FRB/job/Johannesburg/Transactor-Team-Lead--Resources-Sector-Solutions--RSS-_R53753) has the same unavailable rendered-page result and HTTP 403 detail API response. Its previously saved cutoff is also before 30 September; no new deadline is asserted.

At the read-only recheck stage, all three editorial removals remained unchanged. That recheck corrected the cutoff wording and improves the two team-lead source descriptions; it did not change any opportunity, lifecycle value, deadline, addition or removal. Saved evidence: `R53633-recheck.json`, `R53755-recheck.json`, `R53753-recheck.json`, and the corresponding `*-api-recheck.json` files in the local evidence directory. Recheck validation: `npm run acd:test` passed all 125 tests (0 failures); `git diff --check` passed. A JSON-normalized deep comparison confirms all 197 opportunity records are unchanged.

## Batches 7–10

No final 30 September decision/research/handoff artifacts were located in the repository or parent Studat workspace. Filename searches covered `2026-09-30` and `20260930`; content searches covered 30 September date variants in research/runtime, docs and tools. Hits in older snapshots concern deadlines or previous publication data, not final decisions. Existing Batch 7/8 research directories end in August/early September; the Batch 10 handoff found is dated 11 September. Older 16/20/23 September materials were not substituted.

Missing: Batch 7 final ADD and REMOVE/CLOSE roster; Batch 8 final ADD roster; Batch 9 final approved recommendations and decisions; Batch 10 final ADD roster, with precise vacancy identities and source links. Batches 7–10 were left untouched.

## Counts and regression checks

The existing lifecycle uses UTC calendar dates. Verification occurred after midnight in Zurich but before midnight UTC. The release candidate uses the 30 September UTC projection:

| Inventory | Before | After |
| --- | ---: | ---: |
| Live Jobs | 80 | 86 |
| Live Programmes | 12 | 12 |
| Live Open Applications | 17 | 17 |
| Retained removed records | 80 | 82 |
| All records, including history | 189 | 197 |

For the 1 October UTC projection, counts are Jobs **79 → 84**, Programmes **10 → 10**, Open Applications **17 → 17**, retained removed records **83 → 86**. The difference is existing automatic deadline expiry, not additional editorial removals. No lifecycle or production refresh behavior was altered.

All 189 original records remain. Only the three removal/closure changes and the approved R53633 deadline restoration differ in the projected original records. Unaffected records, Programmes and Open Applications are deep-equal to the saved pre-edit snapshot, including Apply URLs and order. IDs/slugs are unique. No source employer records or research runs were changed. SHA-256 comparison confirms all 226 other pre-existing tracked/untracked workspace files are unchanged.

## Changed deliverable files

- `src/data/approved-content-2026-09-30.ts` — new approved records and refresh lifecycle overrides.
- `src/data/opportunities.ts` — include the refresh in the existing projection.
- `src/data/employer-identities.ts` — reuse canonical Partech/Absa identities.
- `public/logos/partech.svg` — official employer symbol.
- `tools/acd/tests/opportunity-data.test.ts` — refresh/regression coverage.
- `docs/audits/2026-09-30-approved-refresh.md` — this audit.

The ignored evidence directory is additional local validation material, not website content. Its manifest lists every artifact.

## Initial validation and preview

- `npm run acd:test`: **125 passed, 0 failed**.
- `npx tsc --noEmit`: **passed**; production build's TypeScript check also passed.
- `npm run lint`: **0 errors**, 23 existing unused-variable warnings in older ignored runtime scripts. Initial helper lint errors were corrected before the successful rerun.
- `npm run build`: **passed**, 105 static pages generated. Initial sandbox font-download failure was resolved by running the same build with network access.
- `git diff --check`: **passed**.
- Desktop 1440×1000 and mobile 390×844: homepage, all eight cards and all eight details checked for title, location, category, seniority, deadlines, loaded logos and Apply URLs. No horizontal overflow or browser page errors.
- Eight new routes returned **200** on both viewports. Seven removed routes returned **404** in the initial preview; the subsequent approved release restores R53633 and retains the other six removals. All live job slugs occur in the sitemap.
- Programmes and Open Applications pages returned **200** on both viewports with all expected records.
- Preview: http://127.0.0.1:3030/

Release baseline: branch `main`, HEAD `ab36f05524c55e0546913fcdb3c9ae1985d52795`. The final commit/deployment verification is saved in the local release evidence. Unrelated pre-existing work is excluded from the commit.

Recommendation: **KEEP**. Missing Batch 7–10 decisions remain an explicitly documented scope limitation; no speculative opportunities were added.

## Production verification follow-up

Refresh commit `b8d71aa429344ebeba5e80fe8e99a1173bbd3bd7` was pushed to `origin/main` and successfully deployed by the existing Vercel Git integration. Production confirmed all nine approved/restored job routes and Apply destinations, and all six removals. It exposed a pre-existing date-sensitive badge hydration defect: Vercel rendered on 30 September UTC while a Zurich browser rendered on 1 October. UTC browser checks had no error; Zurich reproduced React hydration error 418.

A narrowly scoped follow-up makes the server and first client badge render identical; the existing effect then applies the reader's local calendar date and retains the midnight timer. No opportunity data, layout, styling or ordering is changed. This component was clean before the task and does not contain unrelated user edits. The follow-up is validated and deployed separately without rewriting the refresh commit. Final production evidence is saved in `production-release-check.json` and timezone regression evidence alongside it.

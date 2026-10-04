# 4 October 2026 approved refresh — local implementation audit

The user approved the preview and authorized a refresh-only commit, push to origin/main and deployment through the existing Vercel Git workflow on 5 October 2026 (Europe/Zurich). Baseline HEAD and origin/main: `4d0da680955c5040631118b4b1670307087c5060`. Official sources checked on 4 October and rechecked for release on 5 October 2026 (Europe/Zurich).

## Decision reconciliation

All 19 approved decisions are implemented: 15 new Jobs, one existing Job reconciled, and three new Programmes. No other opportunities were added. No Open Applications changed.

- `ACD-0204` already represented CrossBoundary requisition `XF8MGrTZmV`. Its ID, slug, first-publication date and lifecycle are preserved. The current official vacancy supplies the expanded title, Advisory employer identity, four supported locations and detailed description. Older language preferences absent from the current requisition are cleared for this reconciled record.
- New stable IDs: `ACD-0322` through `ACD-0339`. Existing job priority and programme publication sorting place this group first without changing historical dates.
- DBSA `DBS251126-1` is the current combined Financial Modelling & Structuring Specialist vacancy. Historical `ACD-0144` and `ACD-0145` have separate titles and generic board URLs without a verified matching requisition; neither was rewritten or republished.
- Goodwell uses existing canonical identity `employer-082-goodwell-investments`. CrossBoundary Advisory maps to existing `employer-091-crossboundary-group`; Stanbic IBTC maps to the existing Standard Bank CIB identity. No employer registry expansion.

## Release counts

| Inventory | Before | After |
|---|---:|---:|
| Live Jobs | 82 | 97 |
| Live Programmes | 10 | 13 |
| Live Open Applications | 17 | 17 |
| Removed/historical non-live records | 88 | 88 |
| All retained opportunity records | 197 | 215 |

The count increase is 18, not 19: the existing CrossBoundary record is reconciled without duplication. All 196 other pre-existing records compare identically to the baseline; all 17 Open Applications are identical. All 30 pre-existing unrelated modified/untracked files match their initial SHA-256 hashes. The older reference to 31 local changes does not describe this starting working tree.

## Implemented decisions

| ACD ID | Employer | Title | Section | Location | Deadline | Final Apply URL | Final ACD route |
|---|---|---|---|---|---|---|---|
| ACD-0322 | CrossBoundary Advisory | Analyst — Senegal | Jobs | Senegal | Not stated | https://crossboundary.applytojob.com/apply/H5AR9vjMfA/analyst-senegal | /jobs/analyst-senegal-crossboundary-advisory-senegal/ |
| ACD-0323 | CrossBoundary Advisory | Associate — Gambia | Jobs | Gambia | Not stated | https://crossboundary.applytojob.com/apply/XwOeUO2FLt/associate-gambia | /jobs/associate-gambia-crossboundary-advisory-gambia/ |
| ACD-0324 | CrossBoundary Advisory | Associate Principal — Senegal | Jobs | Dakar, Senegal | Not stated | https://crossboundary.applytojob.com/apply/Ha2mIKdhAN/Associate-Principal-Senegal | /jobs/associate-principal-senegal-crossboundary-advisory-dakar-senegal/ |
| ACD-0204 (reconciled) | CrossBoundary Advisory | Senior Associate / Associate Principal — Power & Infrastructure | Jobs | London or Nairobi preferred; Dubai or Mumbai also considered | Not stated | https://crossboundary.applytojob.com/apply/XF8MGrTZmV/senior-associate-associate-principal-power-infrastructure | /jobs/associate-principal-power-infrastructure-crossboundary/ |
| ACD-0325 | British International Investment (BII) | Investment Associate — Disruptive Ventures (Africa) | Jobs | Lagos or Nairobi | 2026-10-15 | https://isw.changeworknow.co.uk/bii/vms/e/careers/positions/bV4HzHzbvmR40MFXn_rWSO | /jobs/investment-associate-disruptive-ventures-africa-british-international-investment-bii-lagos-or-nairobi/ |
| ACD-0326 | British International Investment (BII) | Investment Director — Infrastructure & Climate Equity, Africa and South Asia | Jobs | London, Nairobi or Johannesburg | 2026-10-15 | https://isw.changeworknow.co.uk/bii/vms/e/careers/positions/bbN-2hKbPeHARSMmS9ARcK | /jobs/investment-director-infrastructure-climate-equity-africa-and-south-asia-british-international-investment-bii-london-nairobi-or-johannesburg/ |
| ACD-0327 | African Development Bank (AfDB) | Mini-Grids Finance Specialist | Jobs | Abidjan, Côte d’Ivoire | 2026-10-08 | https://afdb1.fcp.eu.fieldglass.cloud.sap/job_posting.do?id=z26093007575038604815840 | /jobs/mini-grids-finance-specialist-african-development-bank-afdb-abidjan-cote-d-ivoire/ |
| ACD-0328 | European Bank for Reconstruction and Development (EBRD) | Principal Banker | Jobs | Lagos, Nigeria | 2026-10-14 | https://jobs.ebrd.com/job/Lagos-Principal-Banker/1242690901/ | /jobs/principal-banker-european-bank-for-reconstruction-and-development-ebrd-lagos-nigeria/ |
| ACD-0330 | Stanbic Bank Kenya | Trade Specialist | Jobs | Nairobi, Kenya | Not stated | https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=744000152670306 | /jobs/trade-specialist-stanbic-bank-kenya-nairobi-kenya/ |
| ACD-0331 | Stanbic IBTC / Standard Bank Group | Sector Head, Consumer Client Coverage | Jobs | Lagos, Nigeria | Not stated | https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=744000152741449 | /jobs/sector-head-consumer-client-coverage-stanbic-ibtc-standard-bank-group-lagos-nigeria/ |
| ACD-0332 | Standard Bank | Structured Origination Lead | Jobs | London, United Kingdom — African and international markets | Not stated | https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=744000152337259 | /jobs/structured-origination-lead-standard-bank-london-united-kingdom-african-and-international-markets/ |
| ACD-0333 | Goodwell Investments | Investment & Valuation Committee Member — uMunthu II | Jobs | Remote — African investment mandate | Not stated | https://goodwell.bamboohr.com/careers/44 | /jobs/investment-valuation-committee-member-umunthu-ii-goodwell-investments-remote-african-investment-mandate/ |
| ACD-0334 | Development Bank of Southern Africa (DBSA) | Financial Modelling & Structuring Specialist | Jobs | Midrand, South Africa | 2026-10-16 | https://dbsa.erecruit.co/candidateapp/Jobs/View/DBS251126-1 | /jobs/financial-modelling-structuring-specialist-development-bank-of-southern-africa-dbsa-midrand-south-africa/ |
| ACD-0335 | Development Bank of Southern Africa (DBSA) | Programme Manager (Partner-A-District) | Jobs | Midrand, South Africa | 2026-10-14 | https://dbsa.erecruit.co/candidateapp/Jobs/View/DBS260929-2 | /jobs/programme-manager-partner-a-district-development-bank-of-southern-africa-dbsa-midrand-south-africa/ |
| ACD-0336 | Public Investment Corporation (PIC) | Investment Analyst — Unlisted Investments (SME Intermediaries) | Jobs | Pretoria, South Africa | 2026-10-06 | https://www.pic.gov.za/careers | /jobs/investment-analyst-unlisted-investments-sme-intermediaries-public-investment-corporation-pic-pretoria-south-africa/ |
| ACD-0337 | MCB | Funding Executive | Jobs | Port Louis, Mauritius | 2026-10-05 | https://jobs.mcbgroup.com/#en/sites/CX/job/2447 | /jobs/funding-executive-mcb-port-louis-mauritius/ |
| ACD-0329 | British International Investment (BII) | Investment & Impact Graduate Analyst Programme 2027 | Programmes | London, United Kingdom | Not stated | https://targetapply.bii.targetconnect.com/c/bii?utm_source=linkedin | /programmes/ |
| ACD-0338 | Attijariwafa bank | Programme Yeelen | Programmes | Morocco, then Sub-Saharan African group subsidiaries | Not stated | https://ma.linkedin.com/jobs/view/programme-yeelen-groupe-attijariwafa-bank-at-attijariwafa-bank-4465020442 | /programmes/ |

| ACD-0339 | African Development Bank (AfDB) | 2027 Internship Program — Session 1 | Programmes | Abidjan and eligible regional/country offices; remote or on-site by assignment | 2026-10-12 | https://afdb.jobs2web.com/job/Abidjan-2027-INTERNSHIP-PROGRAM-SESSION-1/1441963333/ | /programmes/ |

Programmes use the existing shared `/programmes/` page with expandable details; this task does not introduce individual Programme routes.

## Previously pending Programme — resolved for release

AfDB Internship Session 1 was omitted from the initial preview because afdb.org returned browser verification. A targeted check found the external-candidate link copied with the vacancy; it points to `https://afdb.jobs2web.com/job-invite/2345/`, which redirects to the [matching official AfDB recruitment page](https://afdb.jobs2web.com/job/Abidjan-2027-INTERNSHIP-PROGRAM-SESSION-1/1441963333/). Its title, opening date, 12 October deadline and programme details match the approved vacancy. The live Apply dropdown leads to the Bank's SuccessFactors candidate sign-in (`company=africandev`). No login or application was submitted. The third-party copy was used only to discover the URL; final content and application verification use the official ATS and AfDB programme guidance.

The Programme is now `ACD-0339`, using the existing AfDB identity and logo. Its 5 October publication date reflects completion of the pending addition. Existing publication sorting places it first, followed by BII Graduate and Programme Yeelen, with the existing relative order preserved. All three new Programmes have expanded details.

No approved opportunity was found definitively closed before release; no `approved_but_closed_before_implementation` exception is required.

## Official application checks and source notes

- CrossBoundary: all four final JazzHR pages returned 200, showed the matching title and their own application form. Associate Principal Senegal was resolved from the official corporate careers navigation to its ATS vacancy board: `Ha2mIKdhAN`. It does not use the Analyst form `H5AR9vjMfA`. The Power & Infrastructure casing variants share requisition `XF8MGrTZmV`.
- BII professional roles: official ChangeWorkNow vacancies open, with 15 October deadlines and application actions.
- BII graduate: specified TargetConnect URL retained exactly, including `utm_source=linkedin`. [Official programme PDF](https://assets.bii.co.uk/wp-content/uploads/2026/09/28102418/JD-Investment-and-Impact-Graduate-Analyst-Role-2026.pdf) confirms 9 August 2027 start, 26 months, eight weeks initial training, two twelve-month rotations, degree/cohort restrictions and permanent UK right to work. Graduate/Student visas are not accepted. Applications are rolling; no fixed deadline invented.
- AfDB/SEFA: the official Fieldglass application page is accessible and displays reference `AFDB1JP00001545`, 8 October deadline and application action. Its header says `TUNISTUN` but detailed Duty Station requires at least 50% presence in Abidjan. The listing follows that explicit duty-station statement and discloses the discrepancy. The supporting afdb.org page separately returned 403.
- EBRD: official requisition `36058` returned 200 with Apply now and closing date 14 October 2026. The older/reopened vacancy was expressly approved.
- Standard Bank: all three Apply links use the supplied official Standard Bank job-detail endpoints; SmartRecruiters is not substituted. Structured Origination Lead remains physically London with its explicit African credit/capital-markets mandate.
- Goodwell: official BambooHR vacancy 44 rendered its application form after JavaScript loading. It describes a contract/independent committee mandate, around eight to nine days per year, four meetings and a four-year term. It is not represented as full-time employment. The canonical logo was downloaded from the employer ATS logo endpoint `https://images4.bamboohr.com/466022/logos/cropped.jpg?v=32`.
- DBSA Financial Modelling & Structuring Specialist: resolved from the supplied official Investment Banking board to `https://dbsa.erecruit.co/candidateapp/Jobs/View/DBS251126-1`; deadline 16 October 2026. Programme Manager uses `DBS260929-2`, deadline 14 October.
- PIC: the fresh official careers-page SME Intermediaries PDF confirms `INVST2909`, 6 October, Pretoria, commercial degree and two to three years of experience. An initial download returned mismatched Rest of Africa material; a fresh download of the specifically named SME PDF resolved the discrepancy before drafting. No third-party Apply URL used. [Official careers page](https://www.pic.gov.za/careers) is the exact Apply destination; its advert directs applications to Recruitment1@pic.gov.za.
- MCB: followed the official MCB careers portal to requisition `2447`. Current page shows Funding Executive, Port Louis, Apply now and 5 October 2026 deadline; portal cutoff is 21:55 with no timezone label. Official degree/experience alternatives are a relevant bachelor degree plus three years or diploma plus five years. Final Apply uses `https://jobs.mcbgroup.com/#en/sites/CX/job/2447`.
- Programme Yeelen: employer-controlled LinkedIn vacancy returned 200 and an Apply/sign-in flow. The official Attijariwafa careers navigation leads to the CSOD portal, whose Yeelen overview supports 12–36 months in Morocco. A matching role-specific portal endpoint could not be resolved, so the explicitly supplied employer-controlled LinkedIn vacancy is retained. No separate communications/event roles or spontaneous application was added.

Application verification stops at public vacancy/application-entry screens; no personal data, login or application submission was performed. Third-party widgets and employer sign-in requirements are distinct from ACD route correctness.

## Scope and preservation

No lifecycle, deadline-engine, category/discovery, filter, canonical, sitemap, JobPosting, design or homepage-copy architecture changed. Only the approved reconciliation changes an existing opportunity. Every new dated deadline has provenance and uses existing automatic expiry. New records have no editorial discoveryThemes. The existing Programme details mechanism is enabled for the three new Programme IDs.

All explicit exclusions in the handoff remain excluded. No Batch 11 employer expansion, NI Capital or other rejected/HOLD opportunity was created.

## Files in this task

- `src/data/approved-content-2026-10-04.ts`
- `src/data/opportunities.ts`
- `src/data/employer-identities.ts`
- `src/app/programmes/page.tsx`
- `public/logos/goodwell.jpg`
- `tools/acd/tests/opportunity-data.test.ts`
- `tools/acd/tests/job-countries.test.ts`
- `docs/audits/2026-10-04-approved-refresh.md`

## Initial preview validation (4 October)

- `npm run acd:test`: 137 passed, zero failures.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run lint`: zero errors; 23 pre-existing warnings in runtime/research scripts.
- `npm run build`: passed; 117 static pages generated.
- `git diff --check`: passed. New task files were also checked for trailing whitespace.
- Chromium desktop (1440 px) and mobile (390 px): 48 page checks passed (home/Jobs, Programmes, Open Applications, five category pages and all 16 refreshed Job detail pages in each viewport). Every requested route returned 200, descriptions and metadata matched data, logos decoded successfully, no horizontal overflow and no page JavaScript errors.
- All 97 rendered Job cards matched data ordering in both viewports. Keyword search and Senegal country filtering/clear worked. BII Graduate and Programme Yeelen are the first two Programme cards.
- All 18 implemented/reconciled decisions were followed from the local Apply buttons in Chromium to the exact configured employer-controlled destination. Each rendered the matching role or programme/application entry. No wrong CrossBoundary form, closed-vacancy message or missing destination was found. No applications were submitted.
- Sitemap returned 200 with 109 unique URLs and every refreshed Job route. Individual Programme detail routes do not exist in the accepted architecture; both Programmes render on `/programmes/`.
- Regression assertions updated for the newly used Goodwell employer identity and verified Nairobi eligibility of reconciled `ACD-0204`; country-selection logic itself is unchanged.
- Final preservation comparison: 196 unrelated old records unchanged, all Open Applications unchanged, all 30 protected file hashes identical. No staged changes; HEAD and origin/main remain at the baseline hash.

## Authorized release validation (5 October)

- Complete working-tree ACD suite: 137 passed. Clean release snapshot (HEAD plus only the eight refresh files): 134 passed; unrelated local tests/code are not release dependencies.
- TypeScript passed; production build passed with 117 generated pages. Full lint: zero errors, 23 existing warnings in unrelated runtime/research files.
- All 19 approved application destinations rechecked against live employer pages. AfDB internship now verified through its official ATS and candidate sign-in. MCB requisition 2447 still renders Apply Now and its 5 October closing date; EBRD remains open; PIC still lists the approved SME Intermediaries vacancy.
- Final inventory: 97 Jobs, 13 Programmes, 17 Open Applications; 215 retained records, including 88 removed records. No newly approved opportunity was found closed. No duplicate IDs or slugs; every employer resolves to an existing canonical identity.
- Programme order is AfDB Internship, BII Graduate, Programme Yeelen, then the unchanged older Programme inventory. The 16 approved Job decisions retain the handoff order at the top, including reconciled ACD-0204.
- The 30 unrelated local files remain excluded and byte-identical. All 196 unrelated existing records are unchanged. Only the eight files listed above will be staged.
- Deployment uses the existing Vercel Git integration after the authorized push to origin/main; no working-directory upload is used.

- Final local browser validation: all 48 page checks passed at desktop/mobile widths, with 200 responses, matching content and Apply destinations, decoded logos, working search/filter controls and no browser errors or horizontal overflow. All three new Programmes are visible at the top. Sitemap: 109 unique URLs, including all refreshed Job routes.

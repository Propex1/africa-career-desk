# September 2026 approved opportunity refresh

Implementation date: 27 September 2026. Baseline: `ad7afe3b7428054c643e92edde746726a6db1ed3`.

The user's final Batches 1–10 handoff, as revised before publication, authorizes
22 items. Deduplication yields 21 new records and one update to an existing live Open Application. No excluded,
held, unapproved or historical vacancy is newly published or reactivated.

## Inventory and identity

| Inventory | Before | After |
| --- | ---: | ---: |
| Live Jobs | 66 | 82 |
| Live Programmes | 10 | 12 |
| Live Open Applications | 14 | 17 |
| Historical records, including live | 168 | 189 |
| Enabled SEO category pages | 5 | 5 |
| Unique sitemap URLs | 75 | 91 |

All 16 approved Jobs and both approved Programmes are newly created. New Open
Applications are Symbiotics, Attijari Finances Corp and Ekuity Capital.
Lorax is deduplicated against live `ACD-0051`: same official careers URL, employer
and purpose. Its ID, slug, first-publication-date state and employer identity are
preserved. Its title, summary, location display and verification date are refreshed;
unsubstantiated language hints are omitted.

All other 167 baseline records compare unchanged. No existing lifecycle,
publication status, deadline, theme, primary category or history is changed.
The pre-existing TWC Transactor pair `ACD-0212` / `ACD-0269` shares a title/location
but has different historical requisitions; neither is part of this refresh.

| Stable ID | Section | Employer | Approved title |
| --- | --- | --- | --- |
| ACD-0293 | Jobs | Meridiam | VIE - Analyste Projets & Développement d'Infrastructures SAG - 2027 |
| ACD-0294 | Jobs | F6 Ventures | Senior Investment Associate |
| ACD-0295 | Programmes | AgDevCo | Investment Analyst, Early Career Programme |
| ACD-0296 | Jobs | Standard Bank | Associate, Energy & Infrastructure, Client Coverage |
| ACD-0297 | Jobs | Standard Bank | Senior Vice President, Energy & Infrastructure Finance, Investment Banking |
| ACD-0298 | Jobs | Standard Bank | Senior Vice President, Real Estate Finance, Investment Banking |
| ACD-0299 | Jobs | Standard Bank | Real Estate Finance Executive Vice President, Investment Banking |
| ACD-0300 | Open Applications | Symbiotics | Spontaneous Application |
| ACD-0301 | Jobs | Ezdehar Management | Senior Analyst / Associate |
| ACD-0302 | Jobs | Development Bank of Southern Africa (DBSA) | Principal Credit Officer: Portfolio Management |
| ACD-0303 | Jobs | FONSIS | Manager des Investissements |
| ACD-0304 | Jobs | FONSIS | Manager Risques et Performance |
| ACD-0305 | Jobs | Public Investment Corporation (PIC) | Investment Associate: Multi-Management (Private Markets) |
| ACD-0306 | Jobs | Public Investment Corporation (PIC) | Fund Principal – Unlisted Investments (Infrastructure) |
| ACD-0307 | Jobs | Public Investment Corporation (PIC) | Fund Principal – Unlisted Investments (Intermediaries) |
| ACD-0308 | Programmes | Public Investment Corporation (PIC) | 2027 Graduate Development Programme |
| ACD-0309 | Jobs | BMCE Capital Investments | Chargé d'investissement Confirmé H/F |
| ACD-0310 | Jobs | BMCE Capital Conseil | Chargé d'Affaires M&A H/F |
| ACD-0311 | Jobs | BOA Capital Asset Management | Gérant Analyste H/F |
| ACD-0312 | Open Applications | Attijari Finances Corp | Employment & Internship Applications |
| ACD-0313 | Open Applications | Ekuity Capital | Spontaneous Application |

Existing public/research employer IDs are reused for Meridiam, AgDevCo, F6 Ventures
(Flat6Labs identity), Standard Bank CIB, Symbiotics, Ezdehar, DBSA, FONSIS, PIC,
Attijari Finances Corp and Ekuity. BMCE Capital Investments, BMCE Capital
Conseil and BOA Capital Asset Management get distinct business identities, consistent
with the existing separate BMCE Gestion and Markets identities. Research registry
files are not changed.

## Categories and architecture

| Existing page | Live discovery membership |
| --- | ---: |
| Private Equity, VC & Private Credit | 16 |
| Development Finance | 4 |
| Infrastructure & Project Finance | 21 |
| Investment Banking | 16 |
| Climate & Impact Investing | 7 |

The six existing `private-markets` assignments are unchanged. No theme is assigned
to a new record. The PE board filter and page use the same existing selection rule.
Noncanonical handoff labels map to existing categories: DBSA credit and FONSIS risk
to Legal, Risk & Compliance; FONSIS investments to Fund Management, Treasury &
Investor Relations; multi-manager/intermediary investing to the primary PE category.

Counts, detail routes and sitemap entries derive from existing exports. The existing
display-priority mechanism places the September refresh first, with Meridiam VIE
leading Jobs. First-publication dates and sorting within the remaining cohorts
are unchanged. No new employer posting
dates are asserted, so new records do not independently qualify for JobPosting
structured data. Collection pages remain free of JobPosting markup.

## Source checks and review caveats

Only approved URLs, their role-specific linked documents and official brand assets
were checked; no employer-wide opportunity research was performed.

- All four supplied StandardBank.com URLs render the correct titles. Their public
  source/application links are preserved without SmartRecruiters substitutions.
- **Location correction:** job `744000149539850` / `ACD-0299` explicitly lists
  **Cape Town, Heerengracht Street**, not Johannesburg. The verified official city
  is used and the discrepancy is retained in the record's source description.
- PIC's careers page lists all four approved items. Its linked notices verify
  Pretoria for the two Fund Principals. The Associate notice identifies a team,
  not a job city; that record and the graduate programme show South Africa only.
- PIC Associate applications: `Recruitment4@pic.gov.za`, reference `INVA020`.
  Both Principal applications: `Recruitment5@pic.gov.za`. Graduate applications:
  `picgraduate@pic.gov.za`, reference `PICEED-2027`, official form and supporting
  documents. Expiring signed PDF links are not used as public application URLs.
- PIC's graduate document has stale “2024” internal footers, but its cover,
  careers listing and application form explicitly identify the 2027 intake.
- **AgDevCo deadline:** 30 September is explicitly verified in the approved user
  handoff. The official page/form confirm the programme, but the recheck did not
  independently expose that deadline. This distinction is recorded in provenance.
  The supplied Occupop URL resolves to the official Cezanne recruitment form.
- F6's ATS labels the role “Senior Investment Associate, Egypt”; the exact approved
  display title is retained, with Giza / Greater Cairo in the location field.
- FONSIS's official notice verifies the two distinct FIG roles and the cutoff
  **before 30 October 2026 at 18:00 GMT**. Exact wording is retained. The approved
  lifecycle architecture remains calendar-date based, not intraday scheduled expiry.
- Lorax, PIC and the three BMCE ATS pages were verified in a browser after direct
  requests encountered access/certificate limitations. Meridiam, F6, AgDevCo,
  Symbiotics, Ezdehar, DBSA, FONSIS, Attijari and Ekuity were also accessible.

## Logos

Existing Meridiam, AgDevCo, Standard Bank, Symbiotics, Lorax, DBSA, PIC and BMCE
logos are reused. The BMCE recruitment pages themselves use the group branding
for the approved subsidiary roles.

Five new, unmodified authoritative assets were visually inspected:

| File | Official source |
| --- | --- |
| `public/logos/f6-ventures.jpg` | [F6's ATS brand image](https://images7.bamboohr.com/691213/logos/cropped.jpg?v=47) |
| `public/logos/ezdehar.jpg` | Employer profile logo embedded in the approved LinkedIn hiring post |
| `public/logos/fonsis.jpg` | [FONSIS site brand mark](https://www.fonsis.org/wp-content/uploads/2024/03/PP-fonsis-copie-2-150x150.jpg) |
| `public/logos/attijari-finances-corp.png` | [Official brand asset](https://www.attijarifinancescorp.com/themes/afcorp/logo-black.png) |
| `public/logos/ekuity-capital.png` | [Official brand asset](https://www.ekuitycapital.com/wp-content/uploads/2020/04/image003.png) |

## Validation

- Full existing suite plus four refresh regressions: **101 passed**.
- Opportunity/data subset: **38 passed**.
- TypeScript: `npx tsc --noEmit --incremental false` passed.
- Full lint: no errors; 23 pre-existing unused-variable warnings in ignored local
  research/preview scripts. Those files were not modified.
- Production build: 99 generated pages, including 82 Jobs and five categories.
- `git diff --check` passed. IDs and slugs are unique; no new record duplicates
  an existing employer/title/location or specific application requisition.
- All 31 pre-existing modified/untracked files were SHA-256 checked unchanged.
- Final production browser verification: **48 page checks passed** (1440px desktop
  and 390px mobile), covering Jobs, Programmes, Open Applications, all five
  category pages and every one of the 16 new Job detail routes. Titles, locations,
  categories, exact deadline displays, application hrefs, loaded employer logos,
  canonicals and category membership were checked. No JavaScript errors or
  horizontal overflow were detected. The Lorax card/link/logo also passed separate
  desktop/mobile checks. Screenshots of the sections, long titles, deadline cards,
  employer logos and updated Lorax card were visually reviewed.
- The HTTP sitemap contains **91 unique URLs**, including all 16 new job routes.
- Browser checks used a separate copy of the final production build: an older
  server already running on port 3100 was left untouched. Temporary verification
  servers were stopped after the checks. No external application was submitted.
- Lint of the four changed TypeScript files passed without warnings.

## Files changed

- `src/data/approved-content-2026-09-27.ts` (new approved records)
- `src/data/opportunities.ts` (import and Lorax update)
- `src/data/employer-identities.ts` (required aliases/identities)
- `tools/acd/tests/opportunity-data.test.ts` (refresh regressions and identity count)
- The five logo files listed above
- `docs/audits/2026-09-27-approved-refresh.md` (this handoff/audit)

No UI, styling, discovery/SEO architecture, research tooling or local import files
were edited. No staging, commit, push or deployment was performed.

## 28 September 2026 — content-depth revision (uncommitted)

Reopened all approved source URLs in Chromium. Used the employer text and official
PDFs to paraphrase supported responsibilities and candidate criteria. No additional
opportunities, categories, discovery themes, locations, publication dates or
lifecycle decisions were introduced. Required and preferred qualifications remain
separate. Job-detail components, schema and SEO logic are unchanged.

Programmes have no local detail routes in the accepted architecture. A small,
opt-in expansion on the two approved Programme cards now displays the existing
summary, responsibilities, requirements, preferred qualifications and application
notes. Other Programme cards retain their existing presentation. No route, sitemap,
canonical or JobPosting changes were needed.

| Record | Official content evidence and limitations |
| --- | --- |
| ACD-0293 Meridiam | [Exact vacancy](https://careers.meridiam.com/o/vie-analyste-projets-developpement-dinfrastructures-sag-2027): Gabon/SAG asset management, Central Africa development, modelling, diligence, governance, preferred experience and VIE eligibility. Twelve months; desired start 1 February 2027. |
| ACD-0294 F6 | [BambooHR vacancy](https://f6vc.bamboohr.com/careers/40?source=aWQ9NA%3D%3D): full investment lifecycle, LP/fund work, 5–7 years, degree, English/Arabic, hybrid/full-time, Africa/GCC/Levant coverage. Postgraduate qualification is preferred. |
| ACD-0295 AgDevCo | [Careers](https://agdevco.com/about-us/careers/) and [exact application page](https://api.occupop.com/job/application/investment-analyst-early-career-progra-e8ca9): three-year structure, live transactions, candidate pathways, training and conditional Associate progression. The reopened application page explicitly confirms 30 September 2026; deadline date is unchanged and provenance now records this direct evidence. The page also shows a redirection-support message below the vacancy. |
| ACD-0296 Standard Bank Associate | [Official job 744000149549665](https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=744000149549665): research/modelling, coverage execution support, degree and multiple 3–4-year requirements. CIB product experience of 2–3 years remains preferred. |
| ACD-0297 Standard Bank E&I SVP | [Official job 744000149553928](https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=744000149553928): debt leadership, execution, portfolio/risk, team duties; postgraduate degree; 8–10-year and more-than-10-year experience distinctions preserved. |
| ACD-0298 Standard Bank REF SVP | [Official job 744000149056460](https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=744000149056460): real-estate origination, modelling, negotiation, documentation, coaching and 8–10-year criteria. |
| ACD-0299 Standard Bank REF EVP | [Official job 744000149539850](https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=744000149539850): regional leadership, portfolio targets, complex execution and distressed interventions. Postgraduate degree and 8–10-year criteria. Cape Town, Heerengracht Street remains confirmed. |
| ACD-0300 Symbiotics | [Unsolicited form](https://careers.symbioticsgroup.com/unsolicited_application/) plus [employer home](https://symbioticsgroup.com/): impact/private-markets platform and form instructions. No job-specific location, experience or internship criteria on the form. |
| ACD-0301 Ezdehar | [Official company hiring post](https://www.linkedin.com/posts/privateequity-investment-hiring-share-7505596269009158144-dBM8/): 2–5 years, research, models, memoranda, diligence, documentation and portfolio value creation. Preferred prior functions are separated; no invented degree/language requirement. |
| ACD-0051 Lorax | [Career portal](https://loraxcapitalpartners.com/careers/) and [Our Firm](https://loraxcapitalpartners.com/our-firm/): application fields, CV upload and current Analyst field value. No vacancy specification or internship eligibility is supplied. Existing stable ID and slug preserved. |
| ACD-0302 DBSA | [Official DBS260923-2](https://dbsa.erecruit.co/candidateapp/Jobs/View/DBS260923-2): post-approval portfolio across SA/Rest of Africa/High Impact; covenants, stress tests, credit interventions, ECL and mentoring. Ten-year minimum and postgraduate degree; desirable qualifications remain preferred. Permanent; 9 October deadline retained. |
| ACD-0303 FONSIS Investments | [Recruitment notice](https://www.fonsis.org/fr/avis-de-recrutement-fonds-intergenerationnel/) returned 403 on this recheck; [official FIG PDF](https://www.fonsis.org/wp-content/uploads/2026/09/AVIS-DE-RECRUTEMENT-FIG.pdf) returned 200 and supplied all detail: intergenerational oil/gas savings mandate, allocation, execution and manager oversight. Eight years, Bac+5, French/English. |
| ACD-0304 FONSIS Risk/Performance | Same [official FIG PDF](https://www.fonsis.org/wp-content/uploads/2026/09/AVIS-DE-RECRUTEMENT-FIG.pdf): fund risk, attribution, stress testing, delegated-manager oversight and governance. Eight years, Bac+5, French/English; existing 30 October before 18:00 GMT deadline retained for both FONSIS roles. |
| ACD-0305 PIC Associate | [Official careers](https://www.pic.gov.za/careers), freshly downloaded INVA020 specification: fund sourcing/execution/monitoring, honours degree, 4–6 years, RE05 within six months. Master's and PE/fund-of-funds/multi-manager experience are advantageous. No job city is specified. |
| ACD-0306 PIC Infrastructure Principal | [Official careers](https://www.pic.gov.za/careers), fresh APL010 PDF: strategy, direct/co-investment/fund pipeline, bankability, structuring, post-close asset plans and leadership. Honours, 10+ years, FAIS Representative; postgraduate/professional designation advantageous. |
| ACD-0307 PIC Intermediaries Principal | [Official careers](https://www.pic.gov.za/careers), fresh APL011 PDF: SME lenders and other intermediaries, underlying SME quality/deployment/outcomes, underwriting, covenant terms and intervention. No inferred fund-of-funds mandate. Honours, 10+ years and FAIS Representative. |
| ACD-0308 PIC Graduate | [Official careers](https://www.pic.gov.za/careers), fresh 2027 programme PDF and appended PICEED-2027 form: streams, relevant qualifications, NQF7, 60%, South African citizenship, no prior similar programme and supporting documents. Programme length is unstated. Legacy 2024 internal footers conflict with the explicit 2027 cover/form; disclosed rather than silently corrected. |
| ACD-0309 BMCE Investments | [Official ATS 467](https://bmcecapital-cand.talent-soft.com/offre-de-emploi/emploi-charge-d-investissement-confirme-h-f_467.aspx): eight detailed investment/portfolio duties and a short skills profile. No degree, years, language or software requirement; omitted. Morocco-focused equity/quasi-equity mandate and CDI verified. |
| ACD-0310 BMCE Conseil | [Official ATS 525](https://bmcecapital-cand.talent-soft.com/offre-de-emploi/emploi-charge-d-affaires-m-a-h-f_525.aspx): only four broad responsibilities, retained without inventing an M&A execution checklist. Five years, leading business school abroad, modelling/analysis/strategic skills; no language/software criterion. African advisory scope and CDI verified. |
| ACD-0311 BOA Asset Management | [Official ATS 585](https://bmcecapital-cand.talent-soft.com/offre-de-emploi/emploi-gerant-analyste-h-f_585.aspx): reports, publications, investment notes, analytical tools, sector/economic studies, management projects, databases and ethics. Finance master's and five supported candidate criteria; no stated years, language, software or trading authority. Abidjan/CDI retained. |
| ACD-0312 Attijari | [Official careers](https://www.attijarifinancescorp.com/fr/carrieres): employer activities, Morocco/Africa recruitment and separate employment/internship profiles. No named vacancy inferred. |
| ACD-0313 Ekuity | [Careers](https://www.ekuitycapital.com/fr/carriere/) and [employer home](https://www.ekuitycapital.com/fr/): investment institution background; updated CV/cover letter to careers@ekuitycapital.com. No named vacancy, experience threshold or graduate/internship eligibility supplied. |

Temporary source captures and PDFs were kept outside the repository. This revision
edits only the approved September data file, Lorax's summary/check date, the two
Programme display files and this audit. All unrelated local work remains protected.

### Validation of the content-depth revision

- All 22 approved decisions remain represented: 16 Jobs, two Programmes and four
  standing applications (Lorax remains ACD-0051). Counts remain **82 / 12 / 17**,
  with **189 historical records**; 167 other historical records are unchanged.
- All 18 enriched Job/Programme summaries are substantive; Jobs have 4–9
  responsibility bullets and 5–9 requirement bullets. BMCE Conseil's four broad
  duties reflect the source limitation. BOA now has six responsibilities and five
  requirements, including its verified Finance master's qualification.
- Complete ACD suite: **101 passed**. TypeScript passed after the production build
  completed; a concurrent attempt briefly encountered regenerated Next route
  types. Production build passed with 99 generated pages.
- Lint: zero errors and the same 23 pre-existing local-script warnings. Targeted
  lint on the edited TypeScript/TSX files passed without warnings.
- Desktop (1440px) and mobile (390px): all 36 enriched content views passed full
  text/bullet/apply-link checks and were visually reviewed. No horizontal overflow,
  missing sections or JavaScript errors. BOA before/after screenshots were compared.
- Programme keyboard expansion and normal viewport presentation passed; all four
  Open Application summaries are visible. The two Programmes use expanded card
  content, not newly introduced detail routes.
- Board/category regression checks: 48 page views passed; sitemap still contains
  91 unique URLs. Final wording adjustments were checked again on the final build.
- IDs/slugs and approved non-content metadata remain stable. All 31 unrelated
  local changes retain their original SHA-256 hashes. Nothing staged or committed;
  no push or deployment.

Local review server for the final approved inventory: `http://127.0.0.1:3141/`.


## Pre-publication approval correction

One never-published standing application was deleted following the user's revised
approval, together with its newly added, now-unused public employer mapping. No
closed/removed historical record was created. The approved-content list now has
21 additions; Lorax remains the one updated existing record. Display priority
continues to derive from that list without a separate entry for the deleted item.

Open Applications now begin with Ekuity Capital, Attijari Finances Corp, Symbiotics
and Lorax Capital Partners (ACD-0051), followed by the unchanged older inventory.
Pre-existing research registry entries and research tests are preserved as part of
the 31 unrelated local changes, independently of publication approval.

Validation after this correction: the actual exports contain 82 Jobs, 12 Programmes,
17 Open Applications and 189 total records. All 189 retained records and the order
of every retained section compare exactly with the preceding approved preview.
The deleted addition has no public mapping, display entry, application link,
historical tombstone or detail route, and no reference in the generated public
build or sitemap. The remaining research-only references are pre-existing and
intentionally preserved.

All 101 ACD tests, TypeScript, production build and git diff --check passed. Full
lint has zero errors and the same 23 pre-existing warnings. Desktop/mobile ordering
and six filter checks per viewport passed; all 48 board/category/detail-page checks
passed, with 91 unique sitemap URLs. The deleted item's potential detail URLs
return 404. The 31 unrelated files retain their original SHA-256 hashes. No commit,
push or deployment was performed.

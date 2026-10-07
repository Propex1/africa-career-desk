# Approved opportunity publication — 8 October 2026

## Authorization and baseline

Implements the user-approved 7 October research handoff: nine candidate Jobs and two Open Applications, subject to official-source verification. No additional discovery or editorial selection was performed.

Before implementation, local `main`, remote `origin/main` and the successful Vercel production deployment all matched `01b987a3dcbb71e076681dafeda8a36292188450`. Production and the current-date data projection showed 92 Jobs, 13 Programmes and 17 Open Applications, with 215 retained records. Existing verified deadlines explain the change from the previous release's 97 Jobs; no existing record or lifecycle rule was edited.

Thirty pre-existing modified/untracked files were recorded with SHA-256 hashes and preserved. The research SQLite database was opened read-only. Live and historical opportunity records, prior research exports, research findings and editorial decisions were checked by employer/title, requisition and canonical application URL. No matching live or historical vacancy was found. A prior Absa “Senior Equity Research Analyst: Insurance” finding is a different employer and vacancy, and remains excluded.

## Publication decisions

| Decision | ACD ID | Employer / title | Official destination |
| --- | --- | --- | --- |
| HOLD | — | Standard Bank — Investment Banking Analyst, Advisory | https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=744000153742579 |
| HOLD | — | Stanbic IBTC Capital — Associate, Advisory | https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=744000153832039 |
| ADD Job | ACD-0340 | Nedbank — Principal: TMT & Digital Infrastructure Finance | https://jobs.nedbank.co.za/job/Johannesburg-Principal-TMT-%26-Digital-Infrastructure-Finance/1445133033/ |
| ADD Job | ACD-0341 | Nedbank — Senior Associate: TMT and Digital Infrastructure Finance | https://jobs.nedbank.co.za/job/Johannesburg-Senior-Associate-TMT-and-Digital-Infrastructure-Finance/1445135633/ |
| ADD Job | ACD-0342 | BOAD — Gestionnaire Financier chargé de la Mobilisation des Ressources de Marchés | https://jobs.boad.org/fr/annonce/4616641-un1-gestionnaire-financier-charge-de-la-mobilisation-des-ressources-de-marches-lome |
| ADD Job | ACD-0343 | BOAD — Spécialiste Financement de Projets d’Adaptation | https://jobs.boad.org/fr/annonce/4616959-un-01-specialiste-financement-de-projets-dadaptation-lome |
| ADD Job | ACD-0344 | BOAD — Chargé de Relation Investisseurs | https://jobs.boad.org/fr/annonce/4614419-un-01-charge-de-relation-investisseurs-1172-lome |
| ADD Job | ACD-0345 | BOAD — Cadres chargés de Partenariats Internationaux | https://jobs.boad.org/fr/annonce/4614325-deux-02-cadres-charges-de-partenariats-internationaux-lome |
| ADD Job | ACD-0346 | Prime Securities Brokerage / Prime Holding — Senior Equity Research | mailto:hr@primegroup.org |
| ADD Open Application | ACD-0347 | NAEEM Holding — Open Application | mailto:careers@naeemholding.com |
| ADD Open Application | ACD-0348 | Qalaa Holdings — Open Application | mailto:careers@qalaaholdings.com |

No IDs, public routes or employer additions were created for the two held Standard Bank vacancies. No candidate was classified as definitively closed. All other rejected/HOLD candidates, including RMB Private Wealth Associate, remain untouched.

## Verification and source conflicts

- **Standard Bank:** both exact supplied URLs returned 200 and displayed the correct titles, locations, 6 October posting dates and job references (80401604A-0002 and 80446435A-0001). Their Apply Now links correctly identify the respective vacancies but redirect to blank HTTP 403 SmartRecruiters OneClick pages, including on an actual browser click. A functioning downstream application mechanism could not be reliably verified. Both are HOLD under the user's explicit safeguard; no substituted destination was published. This is a verification failure, not evidence that the roles closed.
- **Nedbank:** both full official adverts and requisitions 148162/148166 were verified. Using the visible Apply dropdown leads to the working SuccessFactors candidate sign-in for Nedbank (`company=C0001228596P`). A naive direct visit to the dropdown's placeholder URL redirects home, so actual button navigation was checked. No deadlines or employer posting dates were invented. No account was created or application submitted.
- **BOAD:** each official vacancy returned 200 and its Postuler button opened a vacancy-specific consent/CV application iframe. Exact headings retain the approved French role names; the “UN(1)” / “UN (01)” and “DEUX (02)” recruitment-count prefixes are represented as position counts in application notes, not extra records. Partnerships advertises two positions under one ACD record.
- **BOAD deadlines:** all four official structured records confirm 31 October 2026. Advert text gives 17:30 TU/UTC, whereas structured metadata gives 13:30:55, 13:32:28, 13:28:39 and 13:36:39 UTC respectively. The existing date-only lifecycle remains unchanged; the conflicting times are disclosed. Investor Relations text omits the year, which is confirmed by its official structured data. Official posting dates are 25 September for ACD-0342/0343 and 24 September for ACD-0344/0345.
- **BOAD experience:** Adaptation's badge says five years but its detailed profile requires seven total, including five in climate finance/projects. Investor Relations and Partnerships badges say five, whereas detailed profiles say at least three. These differences are disclosed. The detailed Adaptation profile does not explicitly impose UEMOA nationality; the other three do. All request nationality documentation. No unstated language or nationality restriction was added.
- **Prime:** the live [employer announcement](https://www.linkedin.com/posts/prime-holding_we-are-hiring-senior-equity-research-activity-7496105820561063936-EgUU) continues to solicit CVs at `hr@primegroup.org`, with no closure notice or deadline. It states four to five years of fundamental-analysis experience, mandatory CFA and English proficiency. Relative age differs between web indexing and the browser; no employer posting date was inferred. Giza is the approved location and [official head-office address](https://primeholdingco.com/contact-us/), not a location expressly stated in the vacancy. This limitation is visible in application notes. “Senior” and “Fund Management, Treasury & Investor Relations” use existing taxonomy values for this senior sell-side equity-research role.
- **NAEEM:** [Join Us](https://www.naeemholding.com/careers/join-us/) explicitly invites general consideration but displays WordPress shortcodes and requires a named-vacancy selection. The [main careers page](https://www.naeemholding.com/careers/) independently publishes `careers@naeemholding.com`; that verified official email is used for the spontaneous application. No specific investment vacancy is implied.
- **Qalaa:** the [official careers page](https://www.qalaaholdings.com/en/careers) invites holding-company enquiries with CV and cover letter at `careers@qalaaholdings.com`, and directs subsidiary applicants to contact subsidiaries separately. No deadline or specific open vacancy is implied.
- Email links are checked against employer-published instructions; mailbox delivery cannot be verified without sending an application, which was not done.

## Branding, architecture and scope

Existing Nedbank and BOAD logos and employer identities are reused. Prime, NAEEM and Qalaa reuse canonical research identities `employer-210-prime-holding`, `employer-211-naeem-holding` and `employer-212-qalaa-holdings`; the unrelated research registry was not edited. New logo files are the official Prime employer-profile image, NAEEM website logo and Qalaa website SVG, checked for successful decoding and correct branding.

The release uses a dated approved-content module and the existing explicit Job-priority list. It adds no sorting algorithm, theme, category, UI, metadata, filter or lifecycle change. Older relative ordering is preserved; existing September Open Application pins remain. Open Applications retain their established section-level route, without inventing Job detail pages. Job descriptions contain 167–212 words plus application notes; Prime is deliberately shorter because its official source supplies less information. Open Application summaries contain 131–133 words.

The new totals are **99 Jobs / 13 Programmes / 19 Open Applications / 224 retained records**, all counted from the actual projection. All 215 pre-existing opportunity objects and all existing Programmes are unchanged.

| Primary Job category | Before | After |
| --- | ---: | ---: |
| Private Equity, VC & Private Credit | 9 | 9 |
| Infrastructure & Project Finance | 23 | 26 |
| Development Finance & Multilaterals | 8 | 9 |
| Climate & Impact Investing | 8 | 8 |
| Investment Banking & Advisory | 19 | 19 |
| Corporate Development, M&A & Strategy | 4 | 4 |
| Fund Management, Treasury & Investor Relations | 15 | 18 |
| Legal, Risk & Compliance | 6 | 6 |

## Validation

Working-tree ACD suite: 139 passed. Clean release suite: 136 passed. TypeScript passed in both copies. Working-tree lint: zero errors and 23 pre-existing warnings in unrelated research scripts; clean release lint: zero warnings or errors. Standard Turbopack production build passed with 119 static pages. `git diff --check` passed.

The clean release preview passed 30 desktop/mobile page checks: homepage/Jobs, Programmes, Open Applications, all five categories and all seven new Job detail pages. New titles, descriptions, requirements, deadlines, logos, canonical links and exact Apply destinations rendered correctly; search, country filtering and ordering passed. Sitemap contained 111 unique URLs including all seven new Job routes. No browser console errors, page errors or horizontal overflow occurred. All 215 original records and all 30 unrelated file hashes remained unchanged. Deployment and production verification are reported separately after publication.

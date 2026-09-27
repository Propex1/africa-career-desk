# Editorial discovery themes — private-markets pilot

Batch 2D, 27 September 2026. This pilot improves discovery on the existing
`/jobs/category/private-equity-venture-capital/` page. It does not change ACD's
primary taxonomy or create another landing page.

## Model and editorial rules

An opportunity retains exactly one primary `roleType`. Its optional
`discoveryThemes` array contains explicitly approved editorial metadata. The
only controlled value currently supported is `private-markets`: substantive
private equity, venture capital or private-credit investment work relevant to
candidates browsing the existing PE/VC/Private Credit page. Broad financial,
infrastructure or impact adjacency alone is insufficient.

The value is constrained by TypeScript and runtime opportunity validation.
Unknown values, non-array values and duplicate entries fail validation.
Omitted or empty metadata adds no secondary match. Themes are never inferred
from employer, title, category, description or AI classification.

Before adding an assignment, an editor must review the specific role's actual
responsibilities and official-source evidence, confirm its current ACD live
state, and record approval and the candidate relevance rationale. HIGH confidence
is required for this pilot. Do not assign a theme to reach an inventory target.
Future assignments or controlled values require the same explicit review;
adding a value does not automatically enable a page or change its matching.

Only the PE page currently declares `discoveryTheme: "private-markets"`. It
matches live Jobs through their primary category OR that explicit theme,
deduplicates by stable ACD ID and preserves input board order. Removed/closed
records and other board sections cannot qualify. Existing verified deadline
and closure rules continue to determine eligibility at build time. A theme
cannot reactivate a role; historical metadata may remain after closure.

Other category pages keep primary-only matching. Overlap with the true primary
page is intentional. Cards continue displaying `roleType`, without a theme
badge. All discovery paths use the same existing job-detail URL. Themes do not
affect job canonical URLs, JobPosting generation, sitemap URLs or ranking.

## Approved initial assignments

Evidence starts with the accepted [Batch 2B role audit](audits/2026-09-27-batch2b-review.md).
Before this implementation, all six complete projected records were hash-matched
against the accepted post-2B/pre-2C snapshot: no record content had changed.
All six remained in live `JOBS` after the accepted Batch 2C corrections, with
active lifecycle status. Their stored role descriptions and responsibilities
were individually reviewed again. This reconfirms ACD's accepted content and
lifecycle state; it is not a claim of a new external source check.

| ID | Role | Retained primary category | Approval rationale |
| --- | --- | --- | --- |
| ACD-0083 | Africa50 IAF — Private Equity Intern | Infrastructure & Project Finance | Explicit PE investment work: modelling, valuation, transaction diligence and portfolio monitoring. |
| ACD-0016 | Africa50 IAF — Senior Investment Director | Infrastructure & Project Finance | Full PE lifecycle: equity/quasi-equity underwriting, execution, board work, value creation and exits. |
| ACD-0005 | Africa50 IAF — Investment Associate | Infrastructure & Project Finance | Fund investment pipeline, valuation, multidisciplinary diligence, negotiations, portfolio monitoring and exits. |
| ACD-0009 | Africa50 — Investment Director, DRE Africa Platform | Climate & Impact Investing | Direct equity deployment, end-to-end investment execution and portfolio value creation; private-equity relevance, not a VC classification. |
| ACD-0151 | responsAbility — Senior Investment Officer for Financial Institutions Debt Financing | Climate & Impact Investing | Direct private-debt origination, senior/subordinated lending, underwriting, structuring and portfolio management. |
| ACD-0041 | responsAbility — Senior Investment Officer in Climate Finance, Sub-Saharan Africa | Climate & Impact Investing | Direct Lending platform: climate-sector debt origination, credit assessment, structuring and execution. |

All six proposed HIGH-confidence roles qualified; none was dropped. No theme
was assigned to BII Financial Services Debt (ACD-0266), Ashburton Credit Research
Head (ACD-0285), CrossBoundary Energy Investment Associate/Senior Associate
(ACD-0139), or any other medium/narrow adjacency. PIDG ACD-0281 remains expired,
unthemed and excluded.

## Resulting membership at implementation

PE discovery increases from 5 to 11 unique live jobs. This is the natural result
of the approved assignments, not a target. Existing board order is:

| Order | ID | Role / employer | Match |
| --- | --- | --- | --- |
| 1 | ACD-0263 | Associate, Investment — Attijariwafa Ventures | Primary |
| 2 | ACD-0252 | Senior Project Managers — Ithmar Capital | Primary |
| 3 | ACD-0227 | Investment Associate — Enza Capital | Primary |
| 4 | ACD-0228 | Investment Principal — Enza Capital | Primary |
| 5 | ACD-0211 | Private Equity Professional with Fund-of-Funds experience in Emerging Markets — responsAbility | Primary |
| 6 | ACD-0151 | Senior Investment Officer for Financial Institutions Debt Financing — responsAbility | Secondary |
| 7 | ACD-0083 | Private Equity Intern, Africa50 IAF | Secondary |
| 8 | ACD-0041 | Senior Investment Officer in Climate Finance, Sub-Saharan Africa — responsAbility | Secondary |
| 9 | ACD-0016 | Senior Investment Director, Africa50 IAF | Secondary |
| 10 | ACD-0009 | Investment Director, DRE Africa Platform — Africa50 | Secondary |
| 11 | ACD-0005 | Investment Associate, Africa50 IAF | Secondary |

The four other category memberships and their ordering are unchanged:
Development Finance 4, Infrastructure 17, Investment Banking 13 and Climate 7.
Overall inventory remains 66 live Jobs, 10 Programmes, 14 Open Applications,
168 historical opportunity records and five category pages.

Batch 2B titles, introductions, metadata, card design, All Jobs control and
deadline presentation are preserved. Batch 2C evidence and lifecycle
corrections are preserved. Batch 3 configuration remains unchanged and disabled.

## Validation

- `npm run acd:test`: 86 tests passed, including seven new pilot tests.
- TypeScript (`tsc --noEmit --incremental false`), repository-source lint,
  production build (83 generated pages) and `git diff --check` passed.
- Local production HTTP checks confirmed all five category memberships and
  ordering, visible primary labels, shared detail links, six themed detail-page
  canonicals and the unchanged 75 unique sitemap URLs.
- Comparing all 168 projected records after omitting `discoveryThemes` found no
  other field changes. Category copy and metadata were also unchanged.
- The 31 unrelated local changes and all five Batch 3 files were hash-checked
  unchanged. Git HEAD and the empty index were preserved; nothing was committed,
  pushed, deployed or activated.

# Approved taxonomy and metadata implementation: 8 November 2026

This supersedes the earlier 17-role unresolved list. Seven parent areas remain unchanged; three owner-approved subcategories bring the total to 23. Job-by-job classifications below are proposals for inspection in the protected preview, not approved publication/removal decisions. All canonical job records remain unchanged.

## Final structure

| Career area | Subcategories |
| --- | --- |
| Private Markets | Private Equity & Growth; Venture Capital; Private Credit; Infrastructure & Real Assets; Fund Investments & Secondaries |
| Development Finance | DFI Investments; Development & Blended Finance; Impact & Climate Finance |
| Investment Banking & Advisory | M&A & Corporate Finance; Valuation & Transaction Advisory; Capital Markets |
| Asset Management & Research | Equity & Fixed Income; Portfolio Management; Investment Research |
| Global Markets & Structuring | Sales & Trading; Derivatives & Structured Products |
| Corporate & Structured Finance | Corporate Banking; Project & Structured Finance; Trade & Syndicated Finance; Treasury, Funding & ALM |
| Corporate Development & Investments | Corporate M&A; Strategic Investments & Strategy; Strategic Finance & Capital Allocation |

## Metadata and presentation

Each classified record has one primary area, one primary subcategory, one Job Function, optional interest tags and employer type when supported by existing employer context. All ten requested Job Functions are controlled values. Cards replace the old category badge with the subcategory and show a small secondary function line where useful; Investment is implicit to avoid redundant text. No function dropdown was added. Search includes function, employer type and specialisation tags. Legacy records remain accepted.

## Reassessment of all 17 roles

| Employer / role | Proposed area | Proposed subcategory | Job Function | Decision / reason |
| --- | --- | --- | --- | --- |
| Absa / Head of Islamic Banking (Principal) | Corporate & Structured Finance | Corporate Banking | Financing & Origination | Proposed: Business-banking franchise and Sharia-compliant financing leadership. Proposed corporate-banking fit; breadth of business-banking coverage is flagged for separate editorial review. |
| Absa / South Africa Bank Treasurer | Corporate & Structured Finance | Treasury, Funding & ALM | Strategic Finance | Proposed: Bank liquidity, funding, capital and asset-liability management directly match the approved Treasury, Funding & ALM subcategory. |
| Beltone Holding / IR Analyst | Corporate Development & Investments | No accurate existing subcategory | Fundraising & Investor Relations | Owner decision required: Relevant corporate IR; Strategic Finance & Capital Allocation would be a loose fit for earnings/disclosures. Decide whether IR belongs there or needs its own subcategory. |
| Africa Global Logistics / Responsable Finance Stratégique / Pilotage & Financements | Corporate Development & Investments | Strategic Finance & Capital Allocation | Strategic Finance | Proposed: Substantive financial modelling, business planning, investment/profitability analysis and financial decision support fit the approved broader strategic-finance remit. |
| Dangote Industries / Business Planning & Performance Management Manager | Corporate Development & Investments | Strategic Finance & Capital Allocation | Strategic Finance | Proposed: Substantive financial modelling, business planning, investment/profitability analysis and financial decision support fit the approved broader strategic-finance remit. |
| Orange Business / Business Performance Partner – Lines of Solution-Orange Wholesale Intl | Corporate Development & Investments | Strategic Finance & Capital Allocation | Strategic Finance | Proposed: Substantive financial modelling, business planning, investment/profitability analysis and financial decision support fit the approved broader strategic-finance remit. |
| Visa / Manager, Account Executive - Fintechs and Wallets Partners, Abidjan | Unresolved | Unresolved | Unresolved | Owner decision required: Commercial fintech/wallet account sales and partnerships. Clarify whether the substantive financing/investment responsibility warrants a category; no removal proposed. |
| Orange Business / Program Manager-Satellite Business Management | Corporate Development & Investments (possible) | Strategic Investments & Strategy (possible) | Research & Analysis (possible) | Owner decision required: Satellite strategy and partnerships versus presales/routine programme coordination. Need a stronger investment/strategic decision-support remit before assigning. |
| Siemens Energy / Commercial Project Manager | Corporate Development & Investments (possible) | Strategic Finance & Capital Allocation (possible) | Strategic Finance (possible) | Owner decision required: Commercial project profitability/accounting could qualify only if substantive financial decision support is central; existing description emphasises delivery/control. |
| CMA CGM / VIE Business Developer — Mauritania | Corporate Development & Investments | Strategic Investments & Strategy | Research & Analysis | Proposed: Opportunity research, project selection and investment-programme analysis support corporate strategy; proposed based on substantive published duties, not the business-development title alone. |
| Africa Global Logistics / Business Development Manager – Vendor Management Inventory M/F | Corporate & Structured Finance (possible) | Trade & Syndicated Finance (possible) | Financing & Origination (possible) | Owner decision required: VMI logistics solution sales with trade-finance context; actual responsibility for structuring financing is unclear. |
| Africa Global Logistics / Chargé d’étude | Corporate Development & Investments | Strategic Finance & Capital Allocation | Research & Analysis | Proposed: Feasibility studies, business cases, budgets and investment/project-portfolio analysis provide substantive financial decision support. |
| Africa Global Logistics / Responsable Développement Offre PME | Corporate Development & Investments (possible) | Strategic Investments & Strategy (possible) | Unresolved | Owner decision required: SME logistics offer/product growth and digital rollout. A budget/ROI reference alone does not establish substantive strategic-finance work. |
| Investisseurs & Partenaires (I&P) / Chargé.e de Suivi Financier et des Opérations | Private Markets | Private Equity & Growth | Fund Finance & Operations | Proposed: IPDEV financial reporting, treasury, compliance and fund operations support private-equity investment vehicles; function makes the non-investment-execution remit explicit. |
| FASA / Investisseurs & Partenaires (I&P) / Portfolio Officer | Private Markets | Fund Investments & Secondaries | Fund Finance & Operations | Proposed: FASA fund-of-funds financial/operational management and portfolio coordination fit Fund Investments & Secondaries with an explicit operations function. |
| Investisseurs & Partenaires / FASA / Legal Officer — Fund of Funds & Structuration | Private Markets | Fund Investments & Secondaries | Investment Legal | Proposed: Fund commitments, investment-vehicle structuring and fund governance fit Fund Investments & Secondaries with a legal function. |
| Standard Bank / Structured Origination Lead | Corporate & Structured Finance | Project & Structured Finance | Financing & Origination | Proposed: Bespoke structured financing across borrowers fits the structured-finance component; project finance is not required for every role in this combined category. |

## Remaining decisions

Six cases remain: Beltone corporate IR; Visa payments account sales; Orange satellite programme management; Siemens commercial project management; AGL vendor-managed-inventory business development; AGL SME logistics offer development. They remain visible and unmodified. Relevant but hard-to-classify cases are distinguished from unclear editorial relevance. No recommendation is treated as removal authorisation.

Corporate IR is a relevant function, but the existing Strategic Finance subcategory does not clearly describe earnings communications and disclosures. Owner should decide whether to include corporate IR within that subcategory or add a more accurate home. No forced assignment has been made.

## Main synchronisation and release controls

At implementation baseline main remains 14cbeff7ed90484c7545d9a9d5074b6da6fcd2ea and is an ancestor of acd-v2. New npm run acd:v2:preflight verifies that origin/main is included and canonical publishing files match main. The preview-only CI workflow runs it on acd-v2 pushes and PRs targeting acd-v2, followed by tests, content check and build. It has read-only contents permissions and no deployment or production credentials.

Before each integration session and final release: fetch origin main and acd-v2, merge main INTO acd-v2 if necessary, reconcile metadata proposals for changed/new records, run preflight/tests/content check/build and inspect the protected preview. This workflow does not automatically merge main updates or protect the production branch; final release still needs explicit owner approval.

The classification overlay checks source identity AND duty evidence. New jobs remain visible without classification; altered duties invalidate old proposals rather than silently applying stale classifications. No existing employer-registry data, source job IDs, URLs, publication dates, lifecycle records or redirects were edited.

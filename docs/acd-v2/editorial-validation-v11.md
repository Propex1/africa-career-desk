# ACD 2.0 editorial validation and eligibility v1.1 candidate

This branch builds on draft [PR #14](https://github.com/Propex1/africa-career-desk/pull/14) at `adf4d262c87bfda3146a77b2131887d57a376c2a`. It evaluates the same seven career areas and 23 subcategories with the frozen `eligibility/1.0.0` and the new `eligibility/1.1.0-candidate`. All assessments are offline. There are zero new owner approvals, zero fresh source checks and zero publication or removal actions.

## Benchmark

The [46-case benchmark](../../tools/acd/editorial-reference/editorial-benchmark-v1.json) uses the five discussion batches: 10, 10, 9, 9 and 8. It includes 42 recovered jobs and four additional workbook evidence cases. Every row has a vacancy ID, employer, title, source revision, source locator, retained responsibilities when available, historical facts or decisions, an editorial assessment with duty references, and any material evidence gap. Duty numbers are one-based. The dataset records Beltone’s existing confirmation separately. The other 45 editorial outcomes are provisional. Some deliberately reuse the 15 analyst challenges from PR #14. The benchmark highlights failure modes and informed candidate development, so its agreement rates do not estimate generalisation.

Frozen inputs are from source commit `58a95fa5212a25fd0719a62c33b11c9e7978153e`. The runner recomputes v1 and verifies its decisions against the recorded PR #14 output. Job and workbook registries are keyed separately because they can share an ID. `--verify-source` checks job duty text, other captured inputs and revision hashes against recovered source records, as well as workbook source and decision provenance. The four workbook cases have no usable duties. IFC ACD-0090 has a summary and Africa context but no retained responsibilities. Recorded expiry, closure or unavailable application URLs cannot establish a scope negative. AFD Cambodia has an original geography-based Skip, with too little evidence for an independent new decision. The archive has no explicit owner-confirmed negative labels and limited duty-backed scope exclusions.

## Where v1 made mistakes

| Weakness | Consequence | Candidate change |
|---|---|---|
| Joining all duties and context into one keyword stream allows terms from unrelated activities to corroborate each other. | Strategy enablement and logistics proposals can qualify from investment and trade-finance language. | Score distinct duty statements, require activity-specific actions or work products, cap repeated evidence and flag conflicts between specialist language and an operational remit. |
| Early exclusions override later checks. Narrow phrases miss domain-equivalent finance work. | Commercial credit proposals can trip retail exclusions. Listed-company research can be lost despite financial modelling and publication duties. | Check specialist origination and research duties before generic commercial exclusions. Test difficult positives and sales negatives independently. |
| A first matching category can hide the job’s mandate. | Trade structuring becomes institutional trading, mezzanine origination becomes FP&A, and portfolio execution becomes research. | Rank supported activity profiles, cite duties, and abstain when close profiles remain plausible. |
| Broad function overrides treat secondary work as the primary output. | Investment roles become ESG, portfolio management becomes Investment, and commercial origination can be mislabeled underwriting. | Require dedicated ESG or fund work before overriding the function. Distinguish order execution, portfolio decision support, credit origination and independent underwriting. |
| Coarse geographic metadata or institutional identity can substitute for a role mandate. | Overseas jobs may be excluded on location or included on a generic regional tag. | Use African location or positive role-level evidence. An overseas location plus a broad regional tag needs corroboration. Keep geography separate from activity. |
| Valid finance may lack a precise subcategory, and legal work needs a distinct gate. | Sovereign risk can be forced into banking, or a legal mention can trigger a specialist classification. | Retain eligible-but-unresolved results with optional area/function hints. Require actual legal duties and initial editorial review for direct investment legal work. |

The candidate uses deterministic, predominantly English duty patterns. Its evidence citations show which statements supported a decision. It cannot infer decision authority from vague text, verify that a description is complete or reason reliably over every paraphrase. Role context helps establish the investment field or mandate. Employer identity does not determine a recommendation. Close candidate scores require review. Publication readiness independently preserves source/application, expiry, closure and editorial gates. It never confers publication or removal authority.

## Fixed-case results

Counts below include agreement on an expected abstention. The detailed output has per-case outcomes and per-field improved, worsened, changed-but-still-disagrees and unchanged flags.

| Cohort and measure | v1.0 | v1.1 candidate |
|---|---:|---:|
| Owner-confirmed jobs, complete agreement | 1/1 | 1/1 |
| Provisional jobs, eligibility agreement | 36/41 | 41/41 |
| Provisional jobs, career area agreement | 32/41 | 39/41 |
| Provisional jobs, subcategory agreement | 31/41 | 39/41 |
| Provisional jobs, Job Function agreement | 25/41 | 39/41 |
| Provisional jobs, agreement on all four fields | 23/41 | 39/41 |
| Provisional jobs unresolved at subcategory level | 9 | 10 |
| Provisional jobs unresolved where analyst proposed a mapping | 3 | 2 |
| Historical workbook cases held for evidence | 4/4 | 4/4 |

- **Eligibility changes.** The candidate includes Société Générale equity research, Nedbank complex commercial origination and Standard Bank’s London Africa-facing structured origination. It moves Strategy Enablement and AGL VMI logistics to Needs Review. Visa wallet sales and Orange satellite delivery remain outside scope.
- **Classification changes.** The candidate distinguishes Africa50 investment execution from dedicated ESG, AgDevCo mezzanine debt from FP&A, Absa trade finance from institutional trading, FIC research from execution, and Absa portfolio implementation from research. FinDev Canada remains Needs Review for geography while receiving a provisional DFI activity. RMB country risk remains without a subcategory, with Banking & Structured Finance and Risk & Underwriting hints.
- **Two mapping regressions against the provisional labels.** DBSA Infrastructure Finance Specialist has evidence for DFI advisory, principal financing and structured infrastructure finance. Dangote Business Planning & Performance Management Manager has both recurring FP&A and appraisal duties. Both move from a v1 mapping that matched the analyst proposal to an explicit v1.1 abstention. Eligibility stays in scope.
- **Evidence gaps.** Both versions abstain on subcategory for the IFC vacancy with sparse duties, the four workbook cases and contested commercial/project-control roles. The two proposed Investment Legal mappings continue to require editorial review. The single confirmed positive case and synthetic controls support no false-inclusion, false-exclusion or measured AI accuracy claim.

## Offline AI-assisted proposals

[Prompt and response validation](../../tools/acd/editorial-reference/classification-assistant-v1.ts) exports a versioned prompt, a JSON response schema generated from the shared taxonomy, a request builder and a validator. An adapter supplies the source revision, model identifier and prompt version. Vacancy text is marked as untrusted input. The response echoes identity and revision and cites duty numbers. Runtime validation checks required fields, allowed values, paired area and subcategory, evidence indices, hard editorial gates and source binding. Citations resolve back to the exact retained text. The result uses the shared `ClassificationProposal` contract and carries `proposed` status. A valid citation proves it points to a real duty. Whether the duty justifies the reasoning still requires evaluation. The interface has no API client or course of action for publication, approval, removal or persistence.

Fixture replay validates the interface and the comparison path. It provides no measured model accuracy. To compare real model output later, provide a JSON array of `{ "provenance": ..., "response": ... }` records to `--replay=/path/to/responses.json`. The runner joins only matching IDs and source revisions and reports model replay coverage separately by authority cohort. The provider request builder includes the prompt, schema, approved taxonomy and evidence. The editorial benchmark labels are excluded from the request.

Run from the repository root with Node 24:

```sh
node tools/acd/editorial-reference/recover.mjs
node tools/acd/editorial-reference/evaluate-benchmark-v11.mjs --verify-source --summary
node tools/acd/editorial-reference/evaluate-benchmark-v11.mjs --verify-source > tools/acd/editorial-reference/generated/editorial-benchmark-v11-results.json
node --test tools/acd/editorial-reference/framework-v11.test.ts tools/acd/editorial-reference/framework-v1.test.ts tools/acd/editorial-reference/reference.test.ts
npm run acd:test
npm run acd:v2:preflight
npx tsc --noEmit --incremental false
```

Before live use, collect a separately adjudicated holdout with sufficient duty-backed negatives and multilingual vacancy descriptions. Evaluate actual model responses, including citation relevance and abstention quality. Integrate a provider adapter with model/version pinning, retries and cost limits, and an editorial-only review queue with revision invalidation and audit records. Test the full review-to-publish authorization boundary separately.

## Editorial decisions with policy impact

| Case | Question for the owner | Proposed treatment |
|---|---|---|
| Nedbank Commercial Mid · DRAFT-dc90b4a89136 | Does ownership of complex multi-entity credit applications qualify a revenue-led relationship role? | Yes. Corporate Banking / Financing & Origination. |
| Standard Bank Strategy Enablement · DRAFT-aa4d33a969b6 | Is documented influence over capital allocation enough when governance and execution dominate? | Require evidence of substantive financial appraisal or responsibility for recommendations. |
| AGL VMI · DRAFT-00fe1ab79fde | Should a sales role with trade-finance proposal wording stay on hold, or be excluded without evidence of financial structuring ownership? | Hold for direct evidence. Lean outside scope. |
| Siemens Commercial Project Manager · DRAFT-b2b3e647c4a8 | How much authority over cash, hedging or guarantees is needed to admit a project-controls role? | Hold until primary financial decision responsibility is clear. |
| Africa50 direct investing and ESG · ACD-0005, ACD-0012, DRAFT-c07abbd13795 | Should dedicated ESG support share the investment field, with separate primary functions? | Infrastructure & Real Assets for all three, with Investment for the first two and Impact & ESG for the coordinator. |
| Africa50 and I&P/FASA counsel · DRAFT-4142b13c28a8, ACD-0250 | Is legal execution of investment agreements and fund commitments sufficient for narrow eligibility after review? | Keep both on mandatory review with Investment Legal proposed. Use the supported underlying field for each. |
| AgDevCo Ventures · ACD-0017 | Should the stated mezzanine debt instrument determine classification for an early-stage impact vehicle? | Private Credit / Investment, subject to contrary evidence of primarily equity deployment. |
| FinDev Canada Blended Finance · ACD-0073 | What suffices to establish Africa coverage in a global emerging-market mandate? | Hold eligibility until the role or team’s mandate explicitly names Africa or covered African markets. |
| DBSA Infrastructure Finance Specialist · ACD-0077 | Where should a DFI role mixing project preparation, structuring and execution sit? | Propose Advisory & Capital Mobilisation to the editor and let the candidate abstain pending clearer principal-lending evidence. |
| RMB Country Risk Head · DRAFT-92837797fbe3 | Can an eligible risk role keep a function and area hint without a subcategory? | Yes. Preserve Risk & Underwriting and keep the child unresolved. |
| Standard Bank FIC Research · ACD-0167 | Do client-facing trade ideas belong to research when published forecasts are the primary product? | Investment Research / Research & Analysis. |
| FNB FX Product House · DRAFT-e7ad6a136e54 | Does pricing and hedge solution design meet the structuring threshold in a mixed product leadership position? | Tentative Structuring & Financial Engineering. Seek instrument and mandate detail. |
| Dangote Business Planning & Performance · DRAFT-c93d3acd7658 | Should capex appraisal or recurring financial planning determine the primary mapping? | Propose Strategic Finance & Investments to the editor. Confirm work mix before automating this distinction. |

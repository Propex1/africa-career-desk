# Agent A historical editorial reference deliverable

Issue: [#10](https://github.com/Propex1/africa-career-desk/issues/10). Branch: `acd2/ai-classification`. Base: `58a95fa5212a25fd0719a62c33b11c9e7978153e`.

The new offline package at `tools/acd/editorial-reference/` recovers 505 historical/current opportunity IDs from the public repository, including 451 Jobs and 89 IDs no longer present in the 416-record current canonical set. It also preserves original source-workbook launch/review history: 130 candidates, including 41 with removal/review/rejection observations. These source candidates overlap canonical identities and include monitoring leads/programmes; do not add their counts to the published job inventory or treat all as editorial negatives.

Historical publication/projection, expiry/closure and source decision facts remain distinct from fresh ACD 2.0 eligibility/classification proposals. Only Beltone's existing explicit owner approval is a confirmed taxonomy label; the reference package creates no new approvals. Sparse responsibilities and unavailable rejected history stay documented. No private monitoring data, production database or external account is accessed.

The deterministic policy baseline emits proposed mappings or explicit holds under `acd-v2/1`. It is a review aid, not an LLM implementation or an automatically selected publishing set. Existing AI classifications are preserved as prior inputs and independently reassessed, not converted to truth. Evaluation defaults to confirmed labels only; the 23-category synthetic policy regressions are separate and cannot support a real-world accuracy claim.

The six new independent tests cover reference reconciliation/provenance, confirmed versus proposed/history labels, all 23 subcategories, scope boundaries/expiry/title-only guards and honest evaluation denominators. The shared runner is intentionally unchanged under coordinator ownership; after review the coordinator can register `../editorial-reference/reference.test.ts` in it. Existing test suite and source-publishing parity remain applicable.

See the package [README](../../tools/acd/editorial-reference/README.md) and `coverage.json` for exact evidence locators, reproduction commands and limitations. Original canonical publishing files, prior audits, contract, taxonomy, dependencies, CI and existing review/proposal files remain unchanged.

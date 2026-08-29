# Africa Career Desk discovery review

This local-only tool collects broad factual vacancy evidence, then gives an editor a separate review and approval step. It never changes `src/data/opportunities.ts`, deploys the site, commits, or pushes.

## Commands

Run a new discovery pass:

```bash
npm run acd:discover
```

Resume a previously interrupted/incomplete run. Completed source checkpoints are skipped:

```bash
npm run acd:resume
```

Start the review interface at `http://127.0.0.1:4317`:

```bash
npm run acd:review
```

Inspect the latest run's counts and source coverage as JSON:

```bash
npm run acd:status
```

Run the deterministic test suite:

```bash
npm run acd:test
```

## Data and workflow

The SQLite database and generated manifests live under `data/acd-runtime/`, which is ignored by Git. Versioned registry definitions, migrations, source adapters and tests live in `tools/acd/`.

Each source has a recorded result, timestamp, count, reason and manual-review indicator. LinkedIn is deliberately attempted as a recorded, manual-review source only; the tool does not authenticate, scrape aggressively or claim complete LinkedIn coverage. "No vacancies found" is reserved for a successful feed check that returns none.

Duplicate matching prioritises requisition ID, normalized official application URL, then a cautious employer/title/location match. Current and prior discovery records plus the existing public opportunity file are compared read-only. Cautious matches remain visible for editorial review.

Classification is a transparent recall-oriented rule interface. It emits a recommended public section, confidence and reasons but never presents itself as AI. A future schema-validated classifier can replace that one module without changing storage or review.

The publication button creates a local JSON manifest only after all blocking evidence gaps have received an explicit reviewer decision. Approved edits are stored in the manifest; publication remains a separate human-controlled task.

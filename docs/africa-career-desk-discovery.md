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

Prepare an immutable, local-only employer research handoff for a stable batch. The dry run previews a small handoff without writing files:

```bash
npm run acd:research:prepare -- --batch batch-08 --dry-run
```

To create a task snapshot, omit `--dry-run`. It writes `research-task.json` and independently resumable employer result files under `data/acd-runtime/research/<batch-run-id>/`:

```bash
npm run acd:research:prepare -- --batch batch-08 --batch-run batch-08-example
npm run acd:research:validate -- --batch-run batch-08-example
```

For a deliberately limited pilot, use explicit employers from one real batch. The snapshot retains the real batch ID but is marked `pilot`; it does not update any batch-cycle state:

```bash
npm run acd:research:prepare -- --batch batch-07 --pilot --employer employer-128-u-s-international-development-finance-corporation-dfc --employer employer-132-west-african-development-bank-boad
```

Validation is read-only. It checks task/result schema versions, exact source observations, and honest coverage status; it never imports results into vacancies or changes the SQLite database. See `tools/acd/research-instructions.md` for the Codex handoff instructions.

## Data and workflow

The SQLite database and generated manifests live under `data/acd-runtime/`, which is ignored by Git. Versioned registry definitions, migrations, source adapters and tests live in `tools/acd/`.

Each source has a recorded result, timestamp, count, reason and manual-review indicator. LinkedIn is deliberately attempted as a recorded, manual-review source only; the tool does not authenticate, scrape aggressively or claim complete LinkedIn coverage. "No vacancies found" is reserved for a successful feed check that returns none.

Duplicate matching prioritises requisition ID, normalized official application URL, then a cautious employer/title/location match. Current and prior discovery records plus the existing public opportunity file are compared read-only. Cautious matches remain visible for editorial review.

Classification is a transparent recall-oriented rule interface. It emits a recommended public section, confidence and reasons but never presents itself as AI. A future schema-validated classifier can replace that one module without changing storage or review.

The publication button creates a local JSON manifest only after all blocking evidence gaps have received an explicit reviewer decision. Approved edits are stored in the manifest; publication remains a separate human-controlled task.

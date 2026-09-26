# Daily production freshness

## Architecture and scope

ACD uses Next.js 16 App Router with `npm run build` (`next build`) on Vercel.
`next.config.ts` enables trailing slashes; it does **not** set `output: 'export'`.
The public opportunity projection is evaluated at module load and pages are
pre-rendered during the build. Historical source records remain in Git.

The repository was linked locally to Vercel project `africa-career-desk` and
GitHub repository `Propex1/africa-career-desk`. Before this batch it contained
no GitHub Actions, `vercel.json`, Vercel Cron or refresh endpoint. The README
described Git-connected deployment, but local files cannot prove the dashboard's
Git integration, production branch, plan, external schedules or deployment history.
Do not assume Git pushes are the only existing deployment trigger.

`.github/workflows/production-freshness.yml` uses GitHub's scheduler to POST to a
Vercel Deploy Hook once daily at **01:17 UTC** (`17 1 * * *`). The hook rebuilds
the latest commit of its configured branch. `buildCache=false` requests a fresh
build so date-dependent projections are recomputed. No checkout, package install,
Git write, research command or publication command runs in this workflow.

The workflow is disabled unless `ACD_DAILY_FRESHNESS_ENABLED` is exactly `true`.
Both scheduled and manual runs are restricted to the repository's default branch.
The hook URL is validated against ACD's existing Vercel project ID. The URL does
not expose which branch it targets, so that binding must be checked in Vercel.

## Why a full rebuild

- **GitHub Actions + Deploy Hook (selected):** one existing GitHub scheduler and
  one scoped secret; reuses the normal Vercel build and all accepted lifecycle logic.
- **Vercel Cron + Deploy Hook:** possible, but adds a public server endpoint and
  a second authentication secret just to request the same rebuild.
- **Vercel Cron + revalidation / ISR:** would require changing when the module-level
  projection is evaluated and coordinating page/data caches. `revalidatePath`
  alone does not guarantee a fresh module-level clock. Unnecessary for a small daily batch.
- **Another scheduler or a Vercel API/CLI deployment pipeline:** adds a service or
  broader credentials. No existing repository-native scheduler was found to reuse.

## Manual activation (after a separately approved release)

1. Release the reviewed baseline and this batch to the approved remote production
   branch through the normal human-approved process. The workflow must also exist
   on GitHub's default branch. The locally committed baseline alone does not update
   GitHub or Vercel. Do not enable the schedule against an older remote tree.
2. In Vercel project **africa-career-desk**, confirm the Git connection is
   `Propex1/africa-career-desk`, verify the Production Branch (normally `main`),
   and verify `npm run build` / Next.js defaults. Keep the normal production
   environment variables. Ensure successful production builds are promoted normally
   and no Ignored Build Step cancels rebuilds merely because the Git SHA is unchanged.
3. Under **Settings > Git > Deploy Hooks**, create **ACD daily freshness** targeting
   that production branch. Only human-approved public source changes may enter this
   branch. A hook deploys its branch tip, not a pinned deployment or the scheduler's
   commit: do not use a branch containing unreleased/unapproved changes. Use branch
   protection/review rules consistent with your existing approval process.
4. In GitHub **Settings > Secrets and variables > Actions > Secrets**, add
   `VERCEL_DEPLOY_HOOK_URL` with the complete generated URL. Do not put it in a
   repository file, a public variable, a `NEXT_PUBLIC_*` variable or client code.
5. In the same Actions settings, under **Variables**, add
   `ACD_DAILY_FRESHNESS_ENABLED` = `true`. GitHub Actions must be enabled for the repo.
   No Vercel API token, Vercel Cron configuration or additional service is required.
6. After authorization to deploy, use **Actions > Daily production freshness > Run
   workflow** on the default branch. Confirm the action succeeds **and** the Vercel
   production deployment finishes successfully with the intended approved commit.
   Check the Jobs board, an expired detail's existing 404/noindex behavior, sitemap
   and category counts. No live hook call was made during local implementation.
7. Enable/check GitHub Actions failure notifications and Vercel deployment failure
   notifications for the maintainer. A successful hook response only acknowledges
   a queued deployment; it does not prove the build or production promotion succeeded.

## Timing, cost and failure behavior

Deadlines retain the existing inclusive UTC convention. A verified hard deadline
of `2026-09-30` remains live through `2026-09-30T23:59:59Z` and is expired in a
build evaluated on `2026-10-01`. The change reaches production after the next
successful daily build, normally after 01:17 UTC, not exactly at midnight.
Unverified deadlines never become automatic removal authority.

The existing `JOBS` projection drives the board, detail lookup, sitemap, category
counts and live JobPosting eligibility. There is no second expiry implementation.
No source records, evidence, editorial decisions or publication dates are mutated.

Requests time out after 20 seconds and retry transient network/429/5xx failures
up to three total attempts, with five-second pauses. The workflow times out after
five minutes and serializes its own runs. It fails on missing/invalid secrets,
HTTP errors or invalid job acknowledgements. Logs omit secret URLs and raw provider
errors. Redirects are rejected. The hook URL is the credential: revoke/recreate it
in Vercel and replace the GitHub secret if exposed. The project ID is not a secret.

A failed request/build leaves the last successful production deployment serving;
freshness can be delayed until a successful retry or later daily run. Check both
GitHub and Vercel when diagnosing a stale board. This workflow cannot serialize
other manual/Git-triggered deployments, so avoid concurrent editorial releases.

One short GitHub job and roughly 30 uncached Vercel builds per month use the
existing accounts' quotas; no paid service is added. Confirm available build usage
in the actual account rather than assuming every plan has unlimited free builds.
GitHub schedules can be delayed or dropped during high load. For public repositories,
GitHub disables schedules after 60 days without repository activity: monitor runs
and re-enable if needed. Do not create artificial commits to keep it alive.

To pause automation, set `ACD_DAILY_FRESHNESS_ENABLED` to `false` or disable the
workflow. Revoke the hook to stop further requests using that credential. These
actions do not remove opportunities or change the current deployment.

## Validation and references

`npm run acd:test` includes mocked workflow execution tests. They never contact a
real Deploy Hook. Existing lifecycle tests cover inclusive UTC expiry, historical
preservation, sitemap removal, category filtering and JobPosting suppression.
Validate workflow YAML with `actionlint` when changing its triggers or structure.

- [Vercel Deploy Hooks, branch binding and cache controls](https://vercel.com/docs/deploy-hooks)
- [Vercel Cron](https://vercel.com/docs/cron-jobs)
- [Next.js revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
- [GitHub schedule behavior and inactivity limits](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Vercel successful production promotion](https://vercel.com/docs/deployment-checks)

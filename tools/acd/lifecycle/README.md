# Public vacancy lifecycle operations

This extends the existing public production-freshness workflow. It does not read or write the private discovery repository or editorial decisions. Original opportunity records remain intact; automated changes are appended to `src/data/job-lifecycle.json` and applied by the existing public projection.

## Policy and schedule

- Daily, `17 1 * * *` (01:17 UTC): check authoritative deadlines within two days or already expired on the currently served website; look for verified extensions before rebuilding.
- Tuesday and Friday, `17 3 * * 2,5` (03:17 UTC): check every active published job, including new additions. The 33 previously uncertain IDs are checked first. No age or interval filter skips jobs.
- Only `schedule` and `workflow_dispatch` triggers; manual scope is `deadlines` or `availability`.
- Shared workflow concurrency prevents overlapping lifecycle runs. Git reference checks and non-force pushes reject independent publications that advance main.
- Uncertain jobs remain live. A failed request, missing search result, generic redirect, login wall, old advert, or HTTP 200 alone cannot authorize closure.
- Explicit job-specific closure templates are supported for JazzHR (including hiring pauses), BII/ChangeWorkNow and BMCE/TalentSoft. A second GET must confirm the result. Pauses are described as paused, never permanently closed.
- Official Workday requisition IDs/application flags, BambooHR status, actual application forms and SmartRecruiters destinations support availability checks. Unknown formats remain uncertain; this is not complete automated verification of every career portal.
- Deadline extraction is limited to exact Workday requisitions and labelled official DBSA, EBRD and BII job pages. Dates must be confirmed twice. Saved authoritative evidence remains valid when a source is temporarily inaccessible. Conflicting evidence blocks publication.
- Existing UTC rules apply: a date-only deadline remains active throughout that UTC date. Unverified display dates cannot expire jobs. Authoritative extensions override old dates. An earlier page date cannot silently shorten a previously verified deadline; it becomes an investigation warning.
- Link corrections require the same employer/requisition or the specifically validated I&P language fallback, followed by a second successful verification. Other corrections require investigation.
- Initial maximum three automatic deactivations per run, including ALL verified deadline expirations and stale production removals. Configure ACD_LIFECYCLE_MAX_REMOVALS to an integer from 1 to 10 (initial value 3). More than five total affected jobs also requires review. The full proposal is retained and no partial batch is applied. Maximum 500 jobs, four concurrent workers, per-host pacing, two bounded GET attempts, 12-second request timeout, 2 MB response limit and eight-minute scan budget. Incomplete scans cannot write.

## Persistence, deployment and failure handling

The check job has `contents: read`. Only the update job has `contents: write` plus `deployments: read` and `statuses: write` for the failure lock. The exact public repository name, ID 1290232097, visibility, main branch, gates and actual authenticated reference are checked. No PAT or cross-repository token is required. All Actions are pinned to commit SHAs.

A plan binds the source commit, UTC date, original data hashes and full selected job set. The write job recomputes its permitted events. It runs ACD tests, lifecycle tests, TypeScript, lint and the existing production build before committing **only** `src/data/job-lifecycle.json`, with an explicit GitHub Actions bot identity. It never rewrites original editorial records, publishes new jobs, changes workflows, force-pushes or rebases automatically.

A data commit uses the existing Vercel Git integration. If no deployment appears after one minute, or only a static deadline rebuild is required, the existing project-bound deploy hook is called once. Unknown hook outcomes are not blindly retried. A failed Production deployment immediately fails the workflow.

Success requires a successful GitHub Production deployment for the expected SHA and matching content on the real production origin. The public `/freshness.json` endpoint exposes only public IDs, routes, Apply URLs, verified dates and a content fingerprint. No `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA` or new Vercel token is required. All active and removed job routes, homepage membership, Apply URLs and sitemap membership are checked. Existing category/search regressions run before publication.

Unchanged content causes no commit or deployment. A failure after committing leaves an auditable data commit and a persistent write lock. Subsequent scans continue, but production changes require explicit clearance after recovery. Once cleared, the next update can restore the expected projection without discarding events. A runner interrupted before pushing cannot damage the remote baseline.

Applied evidence and historical data revisions are permanent Git history. Each run also uploads compact `plan.json`, `report.md`, expected content, and publication/failure results for **30 days**; unchanged-source observations are not retained indefinitely. No raw HTML, cookies, tokens, private notes or local research archives are uploaded. URLs omit nonessential query parameters. Public-source DNS addresses are checked and pinned to the TLS connection. Internal network destinations and LinkedIn automation are refused.

## One-time activation (only after approval)

1. Release only the reviewed lifecycle inventory from a clean checkout of the current public main. Preserve unrelated local changes and the deferred deadline edits. Initial lifecycle events must remain empty.
2. Commit/push the reviewed implementation using the existing authorized public production process. Wait for successful Vercel Production deployment and verify `/freshness.json`, all 91 currently active routes and the 103 historically removed routes. Recalculate counts if independently verified deadlines have since passed.
3. Confirm the existing `VERCEL_DEPLOY_HOOK_URL` secret is present and still targets this project's main branch. The secret name, public identity, enabled Actions and unprotected main were verified read-only during preparation. Its secret value was not retrieved.
4. Keep the existing account $0 Actions budget with Stop Usage enabled. No premium runners or paid APIs are used. Artifact capacity is shared with other repositories; preserve room for these small reports. No Vercel plan upgrade is needed for public collaboration, but the first bot-authored deployment still needs actual hosted verification.
5. Set ACD_LIFECYCLE_LOCK_SHA to this implementation release SHA and ACD_LIFECYCLE_MAX_REMOVALS=3. Initialize the commit status context `acd/lifecycle-write-lock` on that SHA to `success` under the activation approval. Keep the anchor fixed across subsequent data commits. Set public-repository variables `ACD_LIFECYCLE_ENABLED=true` and `ACD_LIFECYCLE_WRITES_ENABLED=true`. These new gates are absent/false until explicitly activated. The replaced workflow no longer reads `ACD_DAILY_FRESHNESS_ENABLED`.
6. First set only ACD_LIFECYCLE_ENABLED=true, keeping ACD_LIFECYCLE_WRITES_ENABLED=false. Execute exactly one supervised manual `availability` run. Verify actual repository-scoped token access, persistent lock readback, all active-job coverage, artifact transfer, and unchanged production. The read-only rehearsal intentionally does not test a real automated data commit or bot deployment. Only after it succeeds set the write gate true.
7. Leave both gates enabled for the stated schedules after a successful rehearsal. If that rehearsal fails, close both gates and report the actual failure. No repeated blind dispatches. GitHub may delay/drop scheduled jobs; this system does not introduce a separate external uptime service.

## Review and recovery

Open GitHub Actions > Public job lifecycle. The summary shows each job, classification and reason; download the run's evidence and production artifacts for full URLs, response hashes, timestamps, proposed events and applied commit. Enable GitHub's ordinary workflow-failure notifications; no paid notification service is needed.

To suspend automation, set both lifecycle variables to false. For a bad data change, inspect the single-file commit and evidence first. Prepare a normal revert of that data commit on current main, run the same validation, and deploy through the existing path. Never reset/force-push or delete history. A rollback can reopen a vacancy; it is an exceptional human-reviewed operation, not an automatic response to a transient failure.

## Local validation

```text
npm ci --ignore-scripts --no-audit --no-fund
npm run acd:test
node --test tools/acd/lifecycle/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

Local `node tools/acd/lifecycle/cli.mjs scan` is read-only and requires the deployed public freshness marker. Before first deployment, `scan --local-baseline` uses the local projection and explicitly marks its plan as unsuitable for hosted publication. Local preparation cannot execute the guarded hosted `prepare` or `publish` commands.

Standard hosted runners in public repositories are free: https://docs.github.com/en/billing/concepts/product-billing/github-actions . At this inventory, expect roughly 39 checks/month and approximately 50-200 runner minutes plus builds when data changes. The measured 91-job scan took about 62 seconds, 165 fetch operations and about 150 KB of report data. Typical retained artifacts should remain below 20 MB for this workflow; 30-day retention and per-report size limits bound growth. Account-wide storage and Vercel limits still apply. Keep the $0 stop-usage safeguard; never enable paid overages to clear a failure.

## Persistent critical-failure lock

The fixed release commit carries a GitHub commit status named acd/lifecycle-write-lock. No extra service, branch, database, PAT or cross-repository access is used. Before preparation, the update job must read an explicit success status, set it to pending, and verify that persisted status. Only the same run/attempt may write while it owns pending. Successful remote data readback and actual Production verification release it to success. Failure marks it error; cancellation or runner termination may leave pending. Both states, missing metadata, API denial and invalid anchor settings deny subsequent writes indefinitely. Ordinary inaccessible sources and uncertain jobs occur in the read-only check job and cannot acquire this lock.

For recovery: leave writes disabled, inspect the failed run and remote data/Production state, repair or roll back the single data commit if necessary, verify serving production, then explicitly post a success status to the same configured anchor/context with a recovery explanation. Re-enable writes only after recovery. Never automatically clear errors, age out pending locks, or rotate the anchor to bypass a failure. The fixed anchor preserves the lock across unrelated main commits and artifact expiry. GitHub limits status entries per SHA/context; approaching that API limit requires an explicitly reviewed anchor rotation, not automatic bypass. The failure lock is effective write authorization; the repository variable can remain true while all writes are blocked by pending/error.

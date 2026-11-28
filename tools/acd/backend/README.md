# ACD 2.0 PostgreSQL proof of concept

This local implementation follows [draft PR #13](https://github.com/Propex1/africa-career-desk/pull/13) and implements the Jobs portion of `OpportunityReader` and `ClassificationProposalStore` from `acd-v2/1`. The importer reads the existing TypeScript projection and board exports from a checkout with committed `src` files. The current website and publishing code have no dependency on this tooling.

## Run against disposable PostgreSQL

Use Node.js 22 or newer. Start a fresh PostgreSQL cluster dedicated to this exercise. These migration roles are cluster-scoped and require a local schema operator with role-creation privileges.

```bash
npm ci
docker run --rm -d --name acd-phase1-pg \
  -e POSTGRES_PASSWORD=acd-local-test -e POSTGRES_DB=acd_phase1 \
  -p 127.0.0.1::5432 postgres:17
docker exec acd-phase1-pg pg_isready -h localhost -d acd_phase1
docker port acd-phase1-pg 5432
```

Once PostgreSQL accepts connections, substitute the reported host port. The test suite runs migrations and creates synthetic snapshots and proposals in this database.

```bash
ACD_PHASE1_PORT=32768 # Replace with the reported port.
export ACD_PHASE1_DATABASE_URL="postgresql://postgres:acd-local-test@127.0.0.1:${ACD_PHASE1_PORT}/acd_phase1"
npm run acd:backend:import
npm run acd:backend:test
docker stop acd-phase1-pg
```

The import prints the snapshot ID, full-record snapshot version, Git commit, UTC projection date and record counts. Capture from the desired code checkout on the intended date. The existing projection reads the clock for lifecycle rules, so a capture on a different date can legitimately produce a different snapshot for the same commit. Identical captures converge on the same snapshot. PostgreSQL retains the JSON values, array order and optional-key presence. Git is the provenance reference for original source bytes.

## Verified baseline

For the source at `dc6e5f3a47ffcfe36a363924985046f87b4db17c`, captured on 2026-11-28, PostgreSQL matched 416 Opportunity payloads, ordered memberships for 114 Jobs, 7 Programmes and 19 Open Applications, and 36 slug redirects. The tests compare full JSON records in source order and cover failed import rollback, scoped source identities, concurrent proposal retries, changed evidence, cursor validation, and denied publication and raw-data access. No parity mismatches were observed in this capture.

## Boundaries and follow-up

- Snapshot selection is explicit. Each immutable snapshot has a full-record version distinct from each job's classification-input hash. A stale proposal is checked against the snapshot selected for the writer. Incremental edits, an authoritative current-version pointer and review transactions are later work.
- The public adapter reads the selected Jobs snapshot and reuses the existing JavaScript eligibility, filter and search rules. Detail lookup follows the current Jobs export membership. Recent sort uses the existing first-publication helper; deadline sort uses ascending parsed dates, with missing dates last and ties in board order. The signed page offset is bound to the immutable snapshot and query. Indexed query performance, preview authentication, cursor lifecycle, section and facet contracts remain integration work.
- The read and proposal roles are exercised through role assumption on the disposable cluster. A production service would need dedicated credentials, scoped access to the selected snapshot, authenticated actor identity and a reviewed trust boundary. No review or publication write path exists in Phase 1.
- The database reserves source-scoped identities for never-published vacancies. Historical SQLite recovery, complete provenance artifacts and the additional relations in the design still need implementation and reconciliation with approved exports. Hosted shadow testing, backup/restore rehearsal and cutover remain later phases.

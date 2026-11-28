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

Once PostgreSQL accepts connections, substitute the reported host port. The test suite runs migrations, creates temporary restricted logins and selects synthetic snapshots in this database.

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

## Activate a snapshot and assign local access

Import and activation are separate. Once you have reconciled an import and verified its printed snapshot ID, select that exact snapshot with the local operator connection.

```bash
npm run acd:backend:import -- --select-public-snapshot "$ACD_PHASE1_SNAPSHOT_ID"
```

Migration 003 leaves the initial selection empty on fresh installs and upgrades. Until the operator selects a snapshot, public reads and new proposal writes fail closed. An import retry never changes selection. Within a request, the Jobs reader gets the selected ID and rows in the same SQL statement. A cursor for a different selection fails. The public views require PostgreSQL's default `READ COMMITTED` isolation so public sessions cannot pin an older snapshot across statements. A read already in progress can finish under PostgreSQL's statement snapshot.

Grant `acd_phase1_reader` to a dedicated read login. Grant `acd_phase1_history_reader` separately to a login authorised to query preserved history. The history role can read source and catalogue history, while the public role can read the selected Jobs projection and taxonomy registry. Neither has table writes. The current backend exposes no editorial-history HTTP endpoint.

For a proposal login, grant `acd_phase1_proposer` and have the local operator bind the login to its ACD actor ID. For example, after creating a password-protected `acd_dev_classifier` login:

```sql
GRANT acd_phase1_proposer TO acd_dev_classifier;
INSERT INTO acd.proposal_principals (login_oid, actor_id)
SELECT oid, 'local-classifier' FROM pg_catalog.pg_roles WHERE rolname = 'acd_dev_classifier';
```

Use that login for `postgresProposalStore` and submit its bound actor ID in `producer.actorId`. Remove its binding when retiring the login. PostgreSQL derives the actor from the authenticated session and validates the proposal against the versioned taxonomy and exact current evidence. The proposal login can execute that function and has no direct proposal-table grants. Only the narrow, non-login function owner can perform the insert. Exact retries return the previously stored ID and differing payloads under the same actor/key conflict. Snapshot changes serialize with new proposal writes. Legacy proposals retain their original IDs and payloads. Their null `validated_login` records that the old write path did not verify a database principal, even if an exact replay returns the existing ID.

## Boundaries and follow-up

- Snapshot revisions preserve each full record separately from its classification-input hash. The public adapter uses the selected Jobs snapshot and existing JavaScript eligibility, filter and search rules. Detail lookup follows existing Jobs membership. Indexed query performance, authenticated preview, incremental record edits, and section/facet contracts remain later work.
- The PostgreSQL registry is seeded from the versioned ACD registry and tested for exact parity. A future version needs a reviewed migration and selection policy. Database validation establishes that evidence matches the stored input and IDs are valid; editorial review still decides whether the classification is substantively supported.
- This local proof has no review or publication write path. Historical SQLite recovery, provenance artifacts, a production credential and authentication design, backup/restore rehearsal, and shadow reconciliation remain later phases.

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { test } from "node:test";
import { ACD_V2_CONTRACT_VERSION, ACD_V2_TAXONOMY_VERSION, type ClassificationProposal, type OpportunityQuery } from "../../../src/contracts/acd-v2.ts";
import { CAREER_AREAS } from "../../../src/data/career-taxonomy.ts";
import { EMPLOYER_TYPES, JOB_FUNCTIONS } from "../../../src/data/job-functions.ts";
import { getApprovedCareerClassification } from "../../../src/lib/career-classification.ts";
import { EMPTY_JOB_BOARD_FILTERS } from "../../../src/lib/job-board-state.ts";
import { filterJobsForBoard } from "../../../src/lib/job-filters.ts";
import { visibleOnBoard } from "../../../src/lib/job-freshness.ts";
import { migrate } from "./database.ts";
import { captureRepositorySnapshot, localPool } from "./local.ts";
import { classificationInput, classificationRevision } from "./revisions.ts";
import { importSnapshot, selectActiveSnapshot } from "./snapshot.ts";
import { postgresOpportunityReader, postgresProposalStore } from "./storage.ts";

type RestrictedRole = "acd_phase1_reader" | "acd_phase1_proposer" | "acd_phase1_history_reader";

async function restrictedLogin(admin: Pool, role: RestrictedRole, actorId?: string) {
  const username = `phase1_test_${randomBytes(12).toString("hex")}`;
  const password = randomBytes(24).toString("hex");
  const url = new URL(process.env.ACD_PHASE1_DATABASE_URL!);
  url.username = username;
  url.password = password;
  const formatRole = async (format: string, args: string[]) => {
    const params = args.map((_, i) => `$${i + 2}::text`).join(", ");
    const { rows: [row] } = await admin.query<{ statement: string }>(
      `SELECT format($1::text, ${params}) AS statement`, [format, ...args],
    );
    await admin.query(row.statement);
  };
  await formatRole("CREATE ROLE %I LOGIN PASSWORD %L IN ROLE %I", [username, password, role]);
  const pool = localPool(url.toString());
  try {
    if (actorId) {
      await admin.query("INSERT INTO acd.proposal_principals SELECT oid, $2 FROM pg_roles WHERE rolname = $1", [username, actorId]);
    }
    const { rows: [identity] } = await pool.query(
      "SELECT session_user AS login, current_user AS role, rolsuper FROM pg_roles WHERE rolname = session_user",
    );
    assert.deepEqual(identity, { login: username, role: username, rolsuper: false });
  } catch (error) {
    await pool.end();
    throw error;
  }
  return {
    pool,
    async close() {
      await pool.end();
      await admin.query("DELETE FROM acd.proposal_principals WHERE login_oid = (SELECT oid FROM pg_roles WHERE rolname = $1)", [username]);
      await formatRole("DROP ROLE %I", [username]);
    },
  };
}

test("Phase 1 against disposable PostgreSQL", async t => {
  const admin = localPool();
  const logins: Awaited<ReturnType<typeof restrictedLogin>>[] = [];
  t.after(async () => {
    try {
      for (const login of logins) await login.close();
    } finally {
      await admin.end();
    }
  });
  await Promise.all([migrate(admin), migrate(admin)]);
  const { rows: migrations } = await admin.query("SELECT name FROM acd.schema_migrations ORDER BY name");
  assert.deepEqual(migrations.map(row => row.name), [
    "001_snapshot.sql", "002_proposals.sql", "003_access_boundaries.sql",
  ]);

  const actorId = randomUUID();
  const login = async (role: RestrictedRole, actor?: string) => {
    const connection = await restrictedLogin(admin, role, actor);
    logins.push(connection);
    return connection.pool;
  };
  const readerPool = await login("acd_phase1_reader");
  const proposerPool = await login("acd_phase1_proposer", actorId);
  const historyPool = await login("acd_phase1_history_reader");
  const unboundPool = await login("acd_phase1_proposer");
  const reader = postgresOpportunityReader(readerPool, randomBytes(32));
  const store = postgresProposalStore(proposerPool);

  const source = await captureRepositorySnapshot();
  assert.ok(source.records.length > 100);
  const [imported, retry] = await Promise.all([importSnapshot(admin, source), importSnapshot(admin, source)]);
  assert.deepEqual(imported, retry);

  await t.test("complete JSON payloads, URLs, dates, redirects and three board ordinals match the source", async () => {
    const { rows: revisions } = await admin.query(`
      SELECT payload, classification_input_revision FROM acd.opportunity_revisions
      WHERE snapshot_id = $1 ORDER BY ordinal
    `, [imported.id]);
    assert.deepEqual(revisions.map(row => row.payload), JSON.parse(JSON.stringify(source.records)));
    assert.deepEqual(revisions.map(row => row.classification_input_revision), source.records.map(classificationRevision));
    const { rows: identities } = await admin.query("SELECT id FROM acd.opportunities WHERE id = ANY($1)", [source.records.map(job => job.id)]);
    assert.equal(identities.length, source.records.length);
    for (const [section, ids] of Object.entries(source.boards)) {
      const { rows } = await admin.query(`
        SELECT opportunity_id FROM acd.board_memberships WHERE snapshot_id = $1 AND section = $2 ORDER BY ordinal
      `, [imported.id, section]);
      assert.deepEqual(rows.map(row => row.opportunity_id), ids);
    }
    const { rows: aliases } = await admin.query(
      "SELECT original_slug, destination_slug FROM acd.url_aliases WHERE snapshot_id = $1", [imported.id],
    );
    assert.deepEqual(Object.fromEntries(aliases.map(row => [row.original_slug, row.destination_slug])), source.redirects);
    t.diagnostic(JSON.stringify({
      commit: source.sourceCommit, projectionDate: source.projectionDate, records: revisions.length,
      boards: Object.fromEntries(Object.entries(source.boards).map(([section, ids]) => [section, ids.length])),
      redirects: aliases.length,
    }));
  });

  await t.test("duplicate IDs/slugs and duplicate membership cannot corrupt a snapshot", async () => {
    const [first, second] = source.records;
    await assert.rejects(importSnapshot(admin, { ...source, records: [...source.records, first] }), /Duplicate opportunity ID/);
    await assert.rejects(importSnapshot(admin, { ...source, records: [...source.records, { ...second, id: "duplicate-slug" }] }), /Duplicate opportunity slug/);
    const countSnapshots = async () => (await admin.query("SELECT count(*) FROM acd.board_snapshots")).rows[0].count;
    const before = await countSnapshots();
    await assert.rejects(importSnapshot(admin, {
      ...source, boards: { ...source.boards, Jobs: [...source.boards.Jobs, source.boards.Jobs[0]] },
    }), { code: "23505" });
    assert.equal(await countSnapshots(), before);
    const key = randomUUID();
    await admin.query("INSERT INTO acd.source_vacancies VALUES ('fixture-a', $1, '{}'), ('fixture-b', $1, '{}')", [key]);
    await assert.rejects(admin.query("INSERT INTO acd.source_vacancies VALUES ('fixture-a', $1, '{}')", [key]), { code: "23505" });
  });

  const context = { audience: "public" } as const;
  const query: OpportunityQuery = {
    asOfDate: source.projectionDate, filters: EMPTY_JOB_BOARD_FILTERS, search: "", sort: "curated", limit: 17,
  };
  const records = new Map(source.records.map(job => [job.id, job]));
  const job = records.get(source.boards.Jobs[0])!;
  const hidden = source.records.find(record => record.boardSection === "Jobs" && !source.boards.Jobs.includes(record.id))!;
  assert.ok(hidden);

  await t.test("public query parity, protected context, filtering and snapshot-bound page cursors", async () => {
    await admin.query("DELETE FROM acd.active_snapshot");
    await assert.rejects(reader.list(query, context), /No active snapshot/);
    await assert.rejects(reader.getById(job.id, context), /No active snapshot/);
    await selectActiveSnapshot(admin, imported.id);
    const expectedJobs = source.boards.Jobs.map(id => records.get(id)!).filter(job => visibleOnBoard(job, query.asOfDate));
    let page = await reader.list(query, context);
    assert.ok(page.nextCursor);
    await assert.rejects(reader.list({ ...query, cursor: `${page.nextCursor}0` }, context), /cursor/);
    await assert.rejects(reader.list({ ...query, search: "different", cursor: page.nextCursor }, context), /cursor/);
    const pagedIds: string[] = [];
    for (;;) {
      assert.equal(page.total, expectedJobs.length);
      assert.equal(page.snapshotRevision, imported.id);
      pagedIds.push(...page.items.map(item => item.opportunity.id));
      if (!page.nextCursor) break;
      page = await reader.list({ ...query, cursor: page.nextCursor }, context);
    }
    assert.deepEqual(pagedIds, expectedJobs.map(job => job.id));
    const search = job.company;
    assert.deepEqual(
      (await reader.list({ ...query, search, limit: 100 }, context)).items.map(item => item.opportunity.id),
      filterJobsForBoard(expectedJobs, query.filters, search).slice(0, 100).map(job => job.id),
    );
    assert.equal((await reader.getById(job.id, context))?.sourceRevision, classificationRevision(job));
    assert.equal(await reader.getById(hidden.id, context), null);
    assert.equal(await reader.getById(source.boards.Programmes[0], context), null);
    await assert.rejects(reader.list(query, { audience: "editorial-preview" }), /audience/);
    await assert.rejects(reader.list({ ...query, asOfDate: "2026-02-30" }, context), /Invalid Jobs query/);
  });

  const proposal: ClassificationProposal = {
    contractVersion: ACD_V2_CONTRACT_VERSION, taxonomyVersion: ACD_V2_TAXONOMY_VERSION,
    opportunityId: job.id, sourceRevision: classificationRevision(job), evidence: classificationInput(job).evidence,
    result: { kind: "unresolved", reason: "Fixture requires editorial review" },
    scopeRecommendation: "outside-future-scope", scopeReason: "Test scope remains advisory",
    createdAt: "2026-11-28T12:00:00Z", producer: { actorId },
  };

  await t.test("concurrent proposal retries converge, conflicting reuse and forged evidence fail", async () => {
    const replies = await Promise.all(Array.from({ length: 6 }, () => store.saveProposal(proposal, "retry")));
    assert.equal(new Set(replies.map(reply => reply.proposalId)).size, 1);
    assert.equal(replies.filter(reply => reply.disposition === "created").length, 1);
    await assert.rejects(store.saveProposal({ ...proposal, scopeReason: "Different payload" }, "retry"), /idempotency conflict/);
    await assert.rejects(store.saveProposal({ ...proposal, evidence: { ...proposal.evidence, summary: "Forged evidence" } }, "forgery"), /evidence conflict/);
    await assert.rejects(store.saveProposal({ ...proposal, producer: { actorId: "other" } }, "actor"), /actor does not match/);
    const { rows } = await admin.query("SELECT id FROM acd.classification_proposals WHERE actor_id = $1", [actorId]);
    assert.equal(rows.length, 1);
  });

  await t.test("restricted SQL callers can only persist validated, attributable proposals", async () => {
    const direct = (pool: Pool, value: unknown, key: string) => pool.query(
      "SELECT * FROM acd.save_proposal($1::jsonb, $2::text)", [JSON.stringify(value), key],
    );
    const { rows: [registry] } = await readerPool.query(
      "SELECT area_children, job_functions, employer_types FROM acd.taxonomy_registry WHERE version = $1",
      [ACD_V2_TAXONOMY_VERSION],
    );
    assert.deepEqual(registry, {
      area_children: Object.fromEntries(CAREER_AREAS.map(area => [area.id, area.subcategories.map(child => child.id)])),
      job_functions: JOB_FUNCTIONS, employer_types: EMPLOYER_TYPES,
    });
    const { rows: [entryPoint] } = await admin.query(`
      SELECT proc.prosecdef, proc.proconfig, owner.rolsuper, owner.rolcanlogin
      FROM pg_catalog.pg_proc proc
      JOIN pg_catalog.pg_roles owner ON owner.oid = proc.proowner
      WHERE proc.oid = 'acd.save_proposal(jsonb,text)'::regprocedure
    `);
    assert.deepEqual(entryPoint, {
      prosecdef: true, proconfig: ["search_path=pg_catalog, pg_temp"], rolsuper: false, rolcanlogin: false,
    });
    const validMetadata = {
      status: "proposed", areaId: "private-markets", subcategoryId: "private-credit",
      jobFunction: JOB_FUNCTIONS[0], employerType: EMPLOYER_TYPES[0], interestTags: ["private debt"],
      rationale: "Fixture evidence", sourceUrl: job.sourceUrl, proposedBy: actorId, proposedAt: "2026-11-28",
      method: "ai-assisted",
    };
    const mapped = (changes = {}) => ({
      ...proposal, result: { kind: "mapped", classification: { ...validMetadata, ...changes } },
    });

    await assert.rejects(proposerPool.query("INSERT INTO acd.classification_proposals DEFAULT VALUES"), { code: "42501" });
    await assert.rejects(proposerPool.query("SELECT classification_input FROM acd.opportunity_revisions"), { code: "42501" });
    await assert.rejects(proposerPool.query("SELECT proposal FROM acd.classification_proposals"), { code: "42501" });
    await assert.rejects(proposerPool.query("SET ROLE acd_phase1_proposal_executor"), { code: "42501" });
    await assert.rejects(direct(readerPool, proposal, "reader"), { code: "42501" });
    await assert.rejects(direct(historyPool, proposal, "history"), { code: "42501" });
    await assert.rejects(direct(unboundPool, proposal, "unbound"), { code: "42501" });
    await assert.rejects(direct(proposerPool, { ...proposal, producer: { actorId: "other" } }, "impersonation"), { code: "42501" });

    const invalid: Record<string, unknown> = {
      "wrong-contract": { ...proposal, contractVersion: "acd-v2/0" },
      "wrong-taxonomy": { ...proposal, taxonomyVersion: "2026-11-27" },
      "wrong-pair": mapped({ subcategoryId: "investment-lending" }),
      "wrong-function": mapped({ jobFunction: "unrecognized" }),
      "wrong-employer-type": mapped({ employerType: "unrecognized" }),
      "non-string-tag": mapped({ interestTags: [42] }),
      "blank-tag": mapped({ interestTags: ["\t"] }),
      "forged-url": mapped({ sourceUrl: "https://example.invalid" }),
      "approved-status": mapped({ status: "approved", approvedBy: actorId }),
      "approval-fields": mapped({ approvedBy: actorId }),
      "wrong-kind": { ...proposal, result: { kind: "publish" } },
      "missing-reason": { ...proposal, result: { kind: "unresolved", reason: "" } },
      "unresolved-child": { ...proposal, result: { ...proposal.result, subcategoryId: "private-credit" } },
      "unresolved-area": { ...proposal, result: { ...proposal.result, suggestedAreaId: "private-credit" } },
      "unresolved-function": { ...proposal, result: { ...proposal.result, suggestedJobFunction: "invalid" } },
      "unsupported-producer": { ...proposal, producer: { actorId, model: 42 } },
      "unsupported-field": { ...proposal, publish: true },
      "bad-timestamp": { ...proposal, createdAt: "2026-02-30T15:00:00Z" },
      "forged-evidence": { ...proposal, evidence: { ...proposal.evidence, summary: "Forged evidence" } },
      "wrong-evidence-type": { ...proposal, evidence: { ...proposal.evidence, requirements: {} } },
      "forged-revision": { ...proposal, sourceRevision: "forged" },
      "invalid-payload": [],
    };
    for (const [key, value] of Object.entries(invalid)) {
      await assert.rejects(direct(proposerPool, value, key), { code: "22023" }, key);
    }
    const { rows: [count] } = await admin.query(
      "SELECT count(*)::int AS count FROM acd.classification_proposals WHERE idempotency_key = ANY($1) AND actor_id = $2",
      [Object.keys(invalid), actorId],
    );
    assert.equal(count.count, 0);
    const { rows: [created] } = await direct(proposerPool, mapped(), "sql-valid");
    assert.equal(created.disposition, "created");
    const { rows: [saved] } = await admin.query(
      "SELECT snapshot_id, actor_id, validated_login IS NOT NULL AS validated FROM acd.classification_proposals WHERE id = $1",
      [created.proposal_id],
    );
    assert.deepEqual(saved, { snapshot_id: imported.id, actor_id: actorId, validated: true });
  });

  await t.test("classification evidence and full-record versions change independently", async () => {
    const displayOnly = { ...job, lastChecked: "Fixture lifecycle refresh" };
    const revised = { ...displayOnly, responsibilities: [...proposal.evidence.responsibilities, "Changed duty"] };
    const withJob = (replacement: typeof job) => ({ ...source, records: source.records.map(item => item.id === job.id ? replacement : item) });
    const displaySnapshot = await importSnapshot(admin, withJob(displayOnly));
    const revisedSnapshot = await importSnapshot(admin, withJob(revised));
    assert.notEqual(displaySnapshot.record_version, imported.record_version);
    assert.notEqual(revisedSnapshot.record_version, displaySnapshot.record_version);
    assert.equal(classificationRevision(displayOnly), proposal.sourceRevision);
    assert.notEqual(classificationRevision(revised), proposal.sourceRevision);
    const withoutAboutRole = { ...job };
    delete withoutAboutRole.aboutRole;
    assert.equal(classificationRevision(withoutAboutRole), classificationRevision({ ...withoutAboutRole, aboutRole: "" }));
    assert.notEqual(classificationRevision({ ...job, responsibilities: ["One", "Two"] }),
      classificationRevision({ ...job, responsibilities: ["Two", "One"] }));
    await selectActiveSnapshot(admin, displaySnapshot.id);
    assert.equal((await store.saveProposal(proposal, "display")).disposition, "created");
    const switcher = await admin.connect();
    const submitting = await proposerPool.connect();
    try {
      await switcher.query("BEGIN");
      await switcher.query("UPDATE acd.active_snapshot SET snapshot_id = $1", [revisedSnapshot.id]);
      await submitting.query("BEGIN");
      await submitting.query("SET LOCAL lock_timeout = '250ms'");
      await assert.rejects(submitting.query(
        "SELECT * FROM acd.save_proposal($1::jsonb, $2::text)", [JSON.stringify(proposal), "switch-in-progress"],
      ), { code: "55P03" });
      await switcher.query("COMMIT");
    } finally {
      await Promise.all([switcher.query("ROLLBACK"), submitting.query("ROLLBACK")]);
      switcher.release();
      submitting.release();
    }
    await assert.rejects(store.saveProposal(proposal, "stale"), /revision or evidence conflict/);
    await assert.rejects(proposerPool.query(
      "SELECT * FROM acd.save_proposal($1::jsonb, $2::text)", [JSON.stringify(proposal), "sql-stale"],
    ), { code: "22023", message: /revision or evidence conflict/ });
    assert.equal((await store.saveProposal(proposal, "display")).disposition, "already-exists");
    assert.equal((await store.saveProposal({
      ...proposal, sourceRevision: classificationRevision(revised), evidence: classificationInput(revised).evidence,
    }, "fresh")).disposition, "created");
    await selectActiveSnapshot(admin, imported.id);
  });

  await t.test("proposals cannot publish, withdraw, replace public metadata, or expose raw records", async () => {
    const before = await reader.list(query, context);
    const hiddenProposal = {
      ...proposal, opportunityId: hidden.id,
      sourceRevision: classificationRevision(hidden), evidence: classificationInput(hidden).evidence,
    };
    assert.equal((await store.saveProposal(hiddenProposal, "historic")).disposition, "created");
    const proposed = {
      status: "proposed", areaId: "private-markets", subcategoryId: "private-credit",
      jobFunction: JOB_FUNCTIONS[0], interestTags: [], rationale: "Test-only proposal",
      sourceUrl: job.sourceUrl, proposedBy: actorId, proposedAt: proposal.createdAt, method: "human",
    } as const;
    await store.saveProposal({ ...proposal, result: { kind: "mapped", classification: proposed } }, "mapped");
    assert.deepEqual(await reader.list(query, context), before);
    assert.equal(await reader.getById(hidden.id, context), null);
    const fixture = {
      ...source,
      records: source.records.map(item => {
        if (item.id === job.id) return { ...item, careerClassification: proposed };
        const approved = { ...proposed, status: "approved" as const, approvedBy: "Fixture reviewer", approvedAt: "2026-11-28" };
        if (item.id === source.boards.Jobs[1]) return { ...item, careerClassification: approved };
        if (item.id === source.boards.Jobs[2]) {
          const malformed = { ...approved, model: "editorial-only test metadata" };
          return { ...item, careerClassification: malformed };
        }
        return item;
      }),
    };
    const fixtureSnapshot = await importSnapshot(admin, fixture);
    assert.deepEqual(await reader.list(query, context), before, "Import leaves public selection unchanged");
    await selectActiveSnapshot(admin, fixtureSnapshot.id);
    await assert.rejects(reader.list({ ...query, cursor: before.nextCursor! }, context), /stale cursor/);
    const item = await reader.getById(job.id, context);
    assert.equal(item?.classification, null);
    assert.equal(Object.hasOwn(item!.opportunity, "careerClassification"), false);
    const raw = await readerPool.query("SELECT payload FROM acd.public_jobs WHERE opportunity_id = $1", [job.id]);
    assert.equal(Object.hasOwn(raw.rows[0].payload, "careerClassification"), false);
    const approved = await reader.getById(source.boards.Jobs[1], context);
    assert.equal(approved?.opportunity.careerClassification?.status, "approved");
    const malformed = await readerPool.query("SELECT payload FROM acd.public_jobs WHERE opportunity_id = $1", [source.boards.Jobs[2]]);
    assert.equal(Object.hasOwn(malformed.rows[0].payload, "careerClassification"), false);
    for (const publicItem of before.items) {
      const approved = getApprovedCareerClassification(records.get(publicItem.opportunity.id)?.careerClassification);
      assert.deepEqual(publicItem.opportunity.careerClassification, approved);
      assert.deepEqual(publicItem.classification, approved ? { kind: "mapped", classification: approved } : null);
    }

    await assert.rejects(proposerPool.query("DELETE FROM acd.board_memberships"), { code: "42501" });
    await assert.rejects(proposerPool.query("UPDATE acd.opportunity_revisions SET payload = '{}'"), { code: "42501" });
    await assert.rejects(proposerPool.query("DELETE FROM acd.classification_proposals"), { code: "42501" });
    await assert.rejects(readerPool.query("SELECT payload FROM acd.opportunity_revisions"), { code: "42501" });
    await assert.rejects(readerPool.query("SELECT proposal FROM acd.classification_proposals"), { code: "42501" });
    await assert.rejects(readerPool.query("INSERT INTO acd.classification_proposals DEFAULT VALUES"), { code: "42501" });
    await selectActiveSnapshot(admin, imported.id);
  });

  await t.test("withdrawn jobs stay in history and disappear from restricted SQL and current detail lookup", async () => {
    const flaggedId = source.boards.Jobs[1];
    const { rows: [before] } = await readerPool.query(
      "SELECT snapshot_id FROM acd.public_jobs WHERE opportunity_id = $1", [job.id],
    );
    assert.equal(before.snapshot_id, imported.id);
    const replacement = await importSnapshot(admin, {
      ...source,
      records: source.records.map(item => item.id === job.id || item.id === flaggedId
        ? { ...item, publicationStatus: "removed" } : item),
      boards: { ...source.boards, Jobs: source.boards.Jobs.filter(id => id !== job.id) },
    });

    const oldReaderTransaction = await readerPool.connect();
    try {
      await oldReaderTransaction.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
      const pinned = await oldReaderTransaction.query("SELECT snapshot_id FROM acd.public_snapshot");
      assert.equal(pinned.rowCount, 0);

      await selectActiveSnapshot(admin, replacement.id);
      const history = await readerPool.query("SELECT * FROM acd.public_jobs WHERE snapshot_id = $1", [imported.id]);
      assert.equal(history.rowCount, 0);
      const withdrawn = await readerPool.query("SELECT * FROM acd.public_jobs WHERE opportunity_id = ANY($1)", [[job.id, flaggedId]]);
      assert.equal(withdrawn.rowCount, 0);
      const pinnedHistory = await oldReaderTransaction.query("SELECT * FROM acd.public_jobs WHERE snapshot_id = $1", [imported.id]);
      assert.equal(pinnedHistory.rowCount, 0);
      assert.equal(await reader.getById(job.id, context), null);
      assert.equal(await reader.getById(flaggedId, context), null);
    } finally {
      await oldReaderTransaction.query("ROLLBACK");
      oldReaderTransaction.release();
    }

    await assert.rejects(readerPool.query("SELECT * FROM acd.board_snapshots WHERE id = $1", [imported.id]), { code: "42501" });
    await assert.rejects(readerPool.query("UPDATE acd.active_snapshot SET snapshot_id = $1", [imported.id]), { code: "42501" });
    await assert.rejects(proposerPool.query("UPDATE acd.active_snapshot SET snapshot_id = $1", [imported.id]), { code: "42501" });
    await assert.rejects(readerPool.query("SET ROLE acd_phase1_history_reader"), { code: "42501" });
    const editorial = await historyPool.query(
      "SELECT payload FROM acd.opportunity_revisions WHERE snapshot_id = $1 AND opportunity_id = $2",
      [imported.id, job.id],
    );
    assert.deepEqual(editorial.rows[0].payload, JSON.parse(JSON.stringify(job)));
    await assert.rejects(historyPool.query("DELETE FROM acd.opportunity_revisions"), { code: "42501" });
  });
});

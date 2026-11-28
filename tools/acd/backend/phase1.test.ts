import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { ACD_V2_CONTRACT_VERSION, ACD_V2_TAXONOMY_VERSION, type ClassificationProposal, type OpportunityQuery } from "../../../src/contracts/acd-v2.ts";
import { JOB_FUNCTIONS } from "../../../src/data/job-functions.ts";
import { getApprovedCareerClassification } from "../../../src/lib/career-classification.ts";
import { EMPTY_JOB_BOARD_FILTERS } from "../../../src/lib/job-board-state.ts";
import { filterJobsForBoard } from "../../../src/lib/job-filters.ts";
import { visibleOnBoard } from "../../../src/lib/job-freshness.ts";
import { migrate } from "./database.ts";
import { captureRepositorySnapshot, localPool } from "./local.ts";
import { classificationInput, classificationRevision } from "./revisions.ts";
import { importSnapshot } from "./snapshot.ts";
import { postgresOpportunityReader, postgresProposalStore } from "./storage.ts";

test("Phase 1 against disposable PostgreSQL", async t => {
  const admin = localPool();
  const readerPool = localPool("acd_phase1_reader");
  const proposerPool = localPool("acd_phase1_proposer");
  t.after(async () => { await Promise.all([admin.end(), readerPool.end(), proposerPool.end()]); });
  await Promise.all([migrate(admin), migrate(admin)]);
  const { rows: migrations } = await admin.query("SELECT name FROM acd.schema_migrations ORDER BY name");
  assert.deepEqual(migrations.map(row => row.name), ["001_snapshot.sql", "002_proposals.sql"]);

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

  const secret = randomBytes(32);
  const reader = postgresOpportunityReader(readerPool, imported.id, secret);
  const context = { audience: "public" } as const;
  const query: OpportunityQuery = {
    asOfDate: source.projectionDate, filters: EMPTY_JOB_BOARD_FILTERS, search: "", sort: "curated", limit: 17,
  };
  const records = new Map(source.records.map(job => [job.id, job]));
  const job = records.get(source.boards.Jobs[0])!;
  const hidden = source.records.find(record => record.boardSection === "Jobs" && !source.boards.Jobs.includes(record.id))!;
  assert.ok(hidden);

  await t.test("public query parity, protected context, filtering and snapshot-bound page cursors", async () => {
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
    const missingReader = postgresOpportunityReader(readerPool, randomUUID(), secret);
    await assert.rejects(missingReader.list(query, context), /Unknown snapshot/);
    await assert.rejects(missingReader.getById(job.id, context), /Unknown snapshot/);
  });

  const actorId = randomUUID();
  const store = postgresProposalStore(proposerPool, imported.id, actorId);
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
    await assert.rejects(store.saveProposal({ ...proposal, producer: { actorId: "other" } }, "actor"), /Invalid classification proposal/);
    const { rows } = await admin.query("SELECT id FROM acd.classification_proposals WHERE actor_id = $1", [actorId]);
    assert.equal(rows.length, 1);
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
    const displayStore = postgresProposalStore(proposerPool, displaySnapshot.id, actorId);
    const revisedStore = postgresProposalStore(proposerPool, revisedSnapshot.id, actorId);
    assert.equal((await displayStore.saveProposal(proposal, "display")).disposition, "created");
    await assert.rejects(revisedStore.saveProposal(proposal, "stale"), /revision or evidence conflict/);
    assert.equal((await revisedStore.saveProposal({
      ...proposal, sourceRevision: classificationRevision(revised), evidence: classificationInput(revised).evidence,
    }, "fresh")).disposition, "created");
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
      records: source.records.map(item => item.id === job.id ? { ...item, careerClassification: proposed } : item),
    };
    const fixtureSnapshot = await importSnapshot(admin, fixture);
    const publicFixture = postgresOpportunityReader(readerPool, fixtureSnapshot.id, secret);
    await assert.rejects(publicFixture.list({ ...query, cursor: before.nextCursor! }, context), /stale cursor/);
    const item = await publicFixture.getById(job.id, context);
    assert.equal(item?.classification, null);
    assert.equal(Object.hasOwn(item!.opportunity, "careerClassification"), false);
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
  });
});

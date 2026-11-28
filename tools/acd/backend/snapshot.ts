import type { Pool } from "pg";
import type { BoardSection, Opportunity } from "../../../src/types/index.ts";
import { publicationDay } from "../../../src/lib/job-freshness.ts";
import { transaction } from "./database.ts";
import { classificationInput, classificationRevision, jsonHash } from "./revisions.ts";

export interface SourceSnapshot {
  sourceCommit: string;
  projectionDate: string;
  records: readonly Opportunity[];
  boards: Readonly<Record<BoardSection, readonly string[]>>;
  redirects: Readonly<Record<string, string>>;
}

export async function importSnapshot(pool: Pool, source: SourceSnapshot) {
  if (publicationDay(source.projectionDate) === null) throw new Error("Invalid projection date");
  const records = new Map(source.records.map(job => [job.id, job]));
  if (records.size !== source.records.length) throw new Error("Duplicate opportunity ID");
  if (new Set(source.records.map(job => job.slug)).size !== records.size) throw new Error("Duplicate opportunity slug");
  const memberships = Object.entries(source.boards).flatMap(([section, ids]) =>
    ids.map((id, ordinal) => {
      if (records.get(id)?.boardSection !== section) throw new Error(`Invalid ${section} membership: ${id}`);
      return { section, id, ordinal };
    }),
  );

  const hash = jsonHash(source);
  const revisions = source.records.map((job, ordinal) => ({
    id: job.id,
    ordinal,
    payload: job,
    input: classificationInput(job),
    revision: classificationRevision(job),
  }));

  return transaction(pool, async client => {
    const key = [source.sourceCommit, hash];
    const { rows: [created] } = await client.query<{ id: string; record_version: string }>(`
      INSERT INTO acd.board_snapshots (source_commit, payload_hash, projection_date) VALUES ($1, $2, $3)
      ON CONFLICT (source_commit, payload_hash) DO NOTHING RETURNING id, record_version
    `, [...key, source.projectionDate]);
    if (!created) {
      const { rows: [existing] } = await client.query<{ id: string; record_version: string }>(
        "SELECT id, record_version FROM acd.board_snapshots WHERE source_commit = $1 AND payload_hash = $2", key,
      );
      return existing;
    }

    await client.query(`
      INSERT INTO acd.opportunities (id)
        SELECT value FROM jsonb_array_elements_text($1::jsonb) ORDER BY value
      ON CONFLICT (id) DO NOTHING
    `, [JSON.stringify([...records.keys()])]);
    await client.query(`
      INSERT INTO acd.opportunity_revisions
        (snapshot_id, opportunity_id, ordinal, payload, classification_input, classification_input_revision)
      SELECT $1, id, ordinal, payload, input, revision
      FROM jsonb_to_recordset($2::jsonb)
        AS row(id text, ordinal integer, payload jsonb, input jsonb, revision text)
    `, [created.id, JSON.stringify(revisions)]);
    await client.query(`
      INSERT INTO acd.board_memberships (snapshot_id, section, opportunity_id, ordinal)
      SELECT $1, section, id, ordinal
      FROM jsonb_to_recordset($2::jsonb) AS row(section text, id text, ordinal integer)
    `, [created.id, JSON.stringify(memberships)]);
    await client.query(`
      INSERT INTO acd.url_aliases (snapshot_id, original_slug, destination_slug)
      SELECT $1, key, value FROM jsonb_each_text($2::jsonb)
    `, [created.id, JSON.stringify(source.redirects)]);
    return created;
  });
}

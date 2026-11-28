import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import type { Pool, PoolClient } from "pg";

export async function transaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      releaseError = new Error("PostgreSQL rollback failed", { cause: rollbackError });
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

export async function migrate(pool: Pool): Promise<void> {
  const directory = new URL("./migrations/", import.meta.url);
  const names = (await readdir(directory)).filter(name => /^\d{3}_[a-z_]+\.sql$/.test(name)).sort();
  await transaction(pool, async client => {
    await client.query("SELECT pg_advisory_xact_lock(1120301)");
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS acd;
      CREATE TABLE IF NOT EXISTS acd.schema_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    const { rows } = await client.query<{ name: string; checksum: string }>(
      "SELECT name, checksum FROM acd.schema_migrations ORDER BY name",
    );
    for (const [index, migration] of rows.entries()) {
      if (migration.name !== names[index]) throw new Error(`Unexpected applied migration ${migration.name}`);
    }
    for (const [index, name] of names.entries()) {
      const sql = await readFile(new URL(name, directory), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const applied = rows[index];
      if (applied) {
        if (applied.checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query("INSERT INTO acd.schema_migrations VALUES ($1, $2)", [name, checksum]);
    }
  });
}

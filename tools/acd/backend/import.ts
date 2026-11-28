import { migrate } from "./database.ts";
import { captureRepositorySnapshot, localPool } from "./local.ts";
import { importSnapshot, selectActiveSnapshot } from "./snapshot.ts";

async function main() {
  const args = process.argv.slice(2);
  const snapshotId = args[0] === "--select-public-snapshot" && args.length === 2 ? args[1] : undefined;
  if (args.length && !snapshotId) throw new Error("Usage: acd:backend:import [--select-public-snapshot SNAPSHOT_ID]");
  const pool = localPool();
  try {
    if (snapshotId) {
      await migrate(pool);
      await selectActiveSnapshot(pool, snapshotId);
      console.log(JSON.stringify({ activeSnapshotId: snapshotId }));
      return;
    }
    const snapshot = await captureRepositorySnapshot();
    await migrate(pool);
    const result = await importSnapshot(pool, snapshot);
    console.log(JSON.stringify({
      ...result,
      sourceCommit: snapshot.sourceCommit,
      projectionDate: snapshot.projectionDate,
      records: snapshot.records.length,
      boards: Object.fromEntries(Object.entries(snapshot.boards).map(([name, ids]) => [name, ids.length])),
      redirects: Object.keys(snapshot.redirects).length,
    }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

import { migrate } from "./database.ts";
import { captureRepositorySnapshot, localPool } from "./local.ts";
import { importSnapshot } from "./snapshot.ts";

async function main() {
  const pool = localPool();
  try {
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

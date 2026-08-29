import { resolve } from "node:path";
import { discover, repairClassifications } from "./run.ts";
import { startReviewServer } from "./server.ts";
import { AcdDatabase } from "./db.ts";
import { verifiedWorkableHumanUrl } from "./collectors.ts";
import { prepareResearchBatch, validateResearchBatch } from "./research.ts";

const root = resolve(import.meta.dirname, "../..");
const command = process.argv[2];
const option = (name: string) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const options = (name: string) => process.argv.flatMap((value, index) => value === name && process.argv[index + 1] ? [process.argv[index + 1]] : []);
if (command === "discover") { const runId = await discover(root); console.log(`Discovery run ${runId} completed. Start review with: npm run acd:review`); }
else if (command === "resume") { const runId = await discover(root, true); console.log(`Discovery run ${runId} completed or resumed.`); }
else if (command === "review") startReviewServer(root);
else if (command === "status") { const database = new AcdDatabase(root); console.log(JSON.stringify(database.dashboard(), null, 2)); database.close(); }
else if (command === "repair-links") { const database = new AcdDatabase(root); let updated = 0; for (const vacancy of database.workableVacancies()) { const url = await verifiedWorkableHumanUrl(vacancy.requisitionId); if (url) { database.updateReviewerUrl(vacancy.id, url); updated++; } } database.close(); console.log(`Validated and updated ${updated} Workable reviewer link(s).`); }
else if (command === "repair-classifications") { const database = new AcdDatabase(root); const run = database.dashboard().run as { id: number } | null; database.close(); if (!run) throw new Error("No run available."); repairClassifications(root, run.id); console.log(`Repaired duplicate classifications for run ${run.id}.`); }
else if (command === "research:prepare") {
  const batchId = option("--batch");
  if (!batchId) throw new Error("Usage: npm run acd:research:prepare -- --batch <batch-id> [--pilot --employer <id> ...] [--batch-run <id>] [--dry-run]");
  const prepared = prepareResearchBatch(root, { batchId, batchRunId: option("--batch-run"), pilot: process.argv.includes("--pilot"), employerIds: options("--employer"), dryRun: process.argv.includes("--dry-run") });
  console.log(JSON.stringify({ batchRunId: prepared.task.batchRunId, taskPath: prepared.taskPath, scope: prepared.task.scope, employerIds: prepared.task.selectedEmployerIds, employers: prepared.task.employers.length, created: prepared.created, dryRun: process.argv.includes("--dry-run") }, null, 2));
}
else if (command === "research:validate") {
  const batchRunId = option("--batch-run");
  if (!batchRunId) throw new Error("Usage: npm run acd:research:validate -- --batch-run <id>");
  const validation = validateResearchBatch(root, batchRunId);
  console.log(JSON.stringify(validation, null, 2));
  if (validation.invalid.length) process.exitCode = 1;
}
else console.error("Usage: npm run acd:discover | acd:resume | acd:review | acd:status | acd:repair-links | acd:research:prepare | acd:research:validate");

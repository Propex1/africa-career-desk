import { resolve } from "node:path";
import { discover, repairClassifications } from "./run.ts";
import { startReviewServer } from "./server.ts";
import { AcdDatabase } from "./db.ts";
import { verifiedWorkableHumanUrl } from "./collectors.ts";

const root = resolve(import.meta.dirname, "../..");
const command = process.argv[2];
if (command === "discover") { const runId = await discover(root); console.log(`Discovery run ${runId} completed. Start review with: npm run acd:review`); }
else if (command === "resume") { const runId = await discover(root, true); console.log(`Discovery run ${runId} completed or resumed.`); }
else if (command === "review") startReviewServer(root);
else if (command === "status") { const database = new AcdDatabase(root); console.log(JSON.stringify(database.dashboard(), null, 2)); database.close(); }
else if (command === "repair-links") { const database = new AcdDatabase(root); let updated = 0; for (const vacancy of database.workableVacancies()) { const url = await verifiedWorkableHumanUrl(vacancy.requisitionId); if (url) { database.updateReviewerUrl(vacancy.id, url); updated++; } } database.close(); console.log(`Validated and updated ${updated} Workable reviewer link(s).`); }
else if (command === "repair-classifications") { const database = new AcdDatabase(root); const run = database.dashboard().run as { id: number } | null; database.close(); if (!run) throw new Error("No run available."); repairClassifications(root, run.id); console.log(`Repaired duplicate classifications for run ${run.id}.`); }
else console.error("Usage: npm run acd:discover | acd:resume | acd:review | acd:status | acd:repair-links");

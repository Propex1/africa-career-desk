import { execFileSync } from "node:child_process";
import { Pool } from "pg";
import type { SourceSnapshot } from "./snapshot.ts";

export function localPool(connectionString = process.env.ACD_PHASE1_DATABASE_URL): Pool {
  if (!connectionString) throw new Error("Set ACD_PHASE1_DATABASE_URL to the disposable acd_phase1 database");
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || !["127.0.0.1", "[::1]"].includes(url.hostname)
    || url.pathname !== "/acd_phase1" || url.search || url.hash || !url.port) {
    throw new Error("Phase 1 requires a loopback PostgreSQL URL with an explicit port and database acd_phase1");
  }
  return new Pool({ connectionString, connectionTimeoutMillis: 5000 });
}

export async function captureRepositorySnapshot(): Promise<SourceSnapshot> {
  const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
  if (git("status", "--porcelain", "--untracked-files=all", "--", "src")) {
    throw new Error("Snapshot capture requires committed src files for reproducible provenance");
  }
  const sourceCommit = git("rev-parse", "HEAD");
  const projectionDate = new Date().toISOString().slice(0, 10);
  const { OPPORTUNITIES, JOBS, PROGRAMMES, OPEN_APPLICATIONS } = await import("../../../src/data/opportunities.ts");
  const { default: redirects } = await import("../../../src/data/job-slug-redirects.json");
  if (new Date().toISOString().slice(0, 10) !== projectionDate) {
    throw new Error("Projection capture crossed UTC midnight; retry for a consistent capture date");
  }
  return {
    sourceCommit,
    projectionDate,
    records: OPPORTUNITIES,
    boards: {
      Jobs: JOBS.map(job => job.id),
      Programmes: PROGRAMMES.map(job => job.id),
      "Open Applications": OPEN_APPLICATIONS.map(job => job.id),
    },
    redirects,
  };
}

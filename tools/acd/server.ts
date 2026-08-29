import { createServer } from "node:http";
import { batchesHtml } from "./batches-page.ts";
import { AcdDatabase } from "./db.ts";
import { reviewHtml } from "./review-page.ts";

export { reviewHtml } from "./review-page.ts";

export function startReviewServer(root: string, port = 4317) {
  const server = createServer(async (request, response) => {
    const send = (status: number, value: unknown) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(value)); };
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    if (url.pathname === "/") { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(batchesHtml); return; }
    if (url.pathname === "/review") { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(reviewHtml); return; }
    const database = new AcdDatabase(root);
    try {
      if (url.pathname === "/api/batches") send(200, database.researchBatchesOverview());
      else if (url.pathname === "/api/dashboard") send(200, database.dashboard(url.searchParams.get("batchId") ?? undefined, Number(url.searchParams.get("runId")) || undefined));
      else if (url.pathname === "/api/manifest-preview") { const runId = Number(url.searchParams.get("runId")); if (!runId) throw new Error("A review run is required."); send(200, database.codexManifestPreview(runId)); }
      else if (url.pathname === "/api/manifest-create" && request.method === "POST") { let body = ""; for await (const chunk of request) body += chunk; const runId = Number(JSON.parse(body).runId); if (!runId) throw new Error("A review run is required."); send(200, database.createCodexManifest(runId)); }
      else if (request.url === "/api/batch/complete" && request.method === "POST") { let body = ""; for await (const chunk of request) body += chunk; database.completeBatch(String(JSON.parse(body).batchId)); send(200, { ok: true }); }
      else if (request.url === "/api/batch/acknowledge" && request.method === "POST") { let body = ""; for await (const chunk of request) body += chunk; const value = JSON.parse(body); database.acknowledgeEmployerLimitation(String(value.batchId), String(value.employerId), String(value.note ?? "Acknowledged limitation."), Boolean(value.manualFollowUp)); send(200, { ok: true }); }
      else if (request.url === "/api/decision" && request.method === "POST") { let body = ""; for await (const chunk of request) body += chunk; const value = JSON.parse(body); database.decide(Number(value.id), value.action, value.edited, value.note); send(200, { ok: true }); }
      else if (request.url === "/api/readiness" && request.method === "POST") { let body = ""; for await (const chunk of request) body += chunk; const value = JSON.parse(body); database.saveReadiness(Number(value.id), value.values ?? {}, String(value.evidenceUrl ?? "")); send(200, { ok: true }); }
      else if (request.url === "/api/freshness-confirmation" && request.method === "POST") { let body = ""; for await (const chunk of request) body += chunk; const value = JSON.parse(body); database.confirmFreshness(Number(value.id), value.note, Boolean(value.override)); send(200, { ok: true }); }
      else send(404, { error: "Not found" });
    } catch (error) { send(400, { error: error instanceof Error ? error.message : "Unexpected error" }); }
    finally { database.close(); }
  });
  server.listen(port, "127.0.0.1", () => console.log(`ACD review is running at http://127.0.0.1:${port}`));
}

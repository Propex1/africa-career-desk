import { createServer } from "node:http";
import { AcdDatabase } from "./db.ts";
import { reviewHtml } from "./review-page.ts";

export { reviewHtml } from "./review-page.ts";

export function startReviewServer(root: string, port = 4317) {
  const server = createServer(async (request, response) => {
    const send = (status: number, value: unknown) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(value)); };
    if (request.url === "/") { response.writeHead(200, { "content-type": "text/html; charset=utf-8" }); response.end(reviewHtml); return; }
    const database = new AcdDatabase(root);
    try {
      if (request.url === "/api/dashboard") send(200, database.dashboard());
      else if (request.url === "/api/decision" && request.method === "POST") { let body = ""; for await (const chunk of request) body += chunk; const value = JSON.parse(body); database.decide(Number(value.id), value.action, value.edited, value.note); send(200, { ok: true }); }
      else if (request.url === "/api/freshness-confirmation" && request.method === "POST") { let body = ""; for await (const chunk of request) body += chunk; const value = JSON.parse(body); database.confirmFreshness(Number(value.id), value.note, Boolean(value.override)); send(200, { ok: true }); }
      else send(404, { error: "Not found" });
    } catch (error) { send(400, { error: error instanceof Error ? error.message : "Unexpected error" }); }
    finally { database.close(); }
  });
  server.listen(port, "127.0.0.1", () => console.log(`ACD review is running at http://127.0.0.1:${port}`));
}

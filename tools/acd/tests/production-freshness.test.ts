import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const workflow = readFileSync(new URL("../../../.github/workflows/production-freshness.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
// Exercise the actual inline workflow program; no real hook is ever contacted.
const script = workflow.split("node <<'NODE'\n")[1]?.split("          NODE")[0]
  ?.replace(/^          /gm, "");
assert.ok(script, "Workflow must contain its runnable Node program.");
const hook = "https://api.vercel.com/v1/integrations/deploy/prj_0sk1RDyLWr9wAwHT4nVJR58MiFoQ/test-secret";

type Reply = { status: number; body?: unknown } | Error;
async function execute(url: string | undefined, replies: Reply[]) {
  const calls: { url: URL; options: RequestInit }[] = [];
  const logs: string[] = [];
  const delays: number[] = [];
  const processMock = { env: { VERCEL_DEPLOY_HOOK_URL: url }, exitCode: 0 };
  await vm.runInNewContext(script!, {
    URL,
    AbortSignal,
    process: processMock,
    console: { log: (s: string) => logs.push(s), error: (s: string) => logs.push(s) },
    require: (name: string) => {
      assert.equal(name, "node:timers/promises");
      return { setTimeout: async (ms: number) => { delays.push(ms); } };
    },
    fetch: async (url: URL, options: RequestInit) => {
      calls.push({ url, options });
      const reply = replies.shift();
      assert.ok(reply, "Unexpected additional deployment request.");
      if (reply instanceof Error) throw reply;
      return {
        status: reply.status,
        ok: reply.status >= 200 && reply.status < 300,
        json: async () => reply.body,
      };
    },
  });
  assert.ok(logs.every((s) => !s.includes("test-secret") && !s.includes("api.vercel.com")), "Logs must not expose the hook.");
  return { calls, logs, delays, exitCode: processMock.exitCode };
}

const accepted = () => ({ status: 200, body: { job: { id: "test-job", state: "PENDING" } } });

test("daily refresh is opt-in, default-branch-only and has no editorial or repository write steps", () => {
  assert.match(workflow, /cron: '17 1 \* \* \*'/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions: \{\}/);
  assert.match(workflow, /vars\.ACD_DAILY_FRESHNESS_ENABLED == 'true'/);
  assert.match(workflow, /github\.ref == format\('refs\/heads\/\{0\}', github\.event\.repository\.default_branch\)/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /timeout-minutes: 5/);
  assert.doesNotMatch(workflow, /^\s*(?:push|pull_request|pull_request_target|uses):/m);
  assert.doesNotMatch(workflow, /npm |git (?:push|commit)|acd:(?:discover|research|review)|NEXT_PUBLIC_/);
  assert.equal((workflow.match(/\brun: \|/g) ?? []).length, 1);
});

test("refresh fails closed for missing, foreign or credential-bearing hook URLs", async () => {
  for (const url of [undefined, "", "not-a-url", hook.replace("https:", "http:"),
    hook.replace("api.vercel.com", "example.test"), hook.replace("prj_0sk1RDyLWr9wAwHT4nVJR58MiFoQ", "prj_other"),
    hook.replace("https://", "https://user:password@"), `${hook}#fragment`]) {
    const result = await execute(url, []);
    assert.equal(result.exitCode, 1);
    assert.equal(result.calls.length, 0);
  }
});

test("refresh requests one uncached rebuild without a payload and forbids redirects", async () => {
  const result = await execute(`${hook}?buildCache=true`, [accepted()]);
  assert.equal(result.exitCode, 0);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].url.search, "?buildCache=false");
  assert.equal(result.calls[0].options.method, "POST");
  assert.equal(result.calls[0].options.redirect, "error");
  assert.equal(result.calls[0].options.body, undefined);
  assert.ok(result.calls[0].options.signal instanceof AbortSignal);
  assert.match(result.logs.join("\n"), /Rebuild accepted/);
});

test("refresh retries transient errors within a bounded budget and hides network secrets", async () => {
  const recovered = await execute(hook, [new Error(`Network error at ${hook}`), { status: 503 }, accepted()]);
  assert.equal(recovered.exitCode, 0);
  assert.equal(recovered.calls.length, 3);
  assert.deepEqual(recovered.delays, [5000, 5000]);
  const limited = await execute(hook, [{ status: 429 }, accepted()]);
  assert.equal(limited.exitCode, 0);
  const failed = await execute(hook, Array.from({ length: 3 }, () => new Error(hook)));
  assert.equal(failed.exitCode, 1);
  assert.equal(failed.calls.length, 3);
  assert.match(failed.logs.join("\n"), /failed after three attempts/);
  const unavailable = await execute(hook, [{ status: 503 }, { status: 503 }, { status: 503 }]);
  assert.equal(unavailable.exitCode, 1);
  assert.equal(unavailable.calls.length, 3);
});

test("refresh reports HTTP and acknowledgement failures without printing provider content", async () => {
  for (const reply of [{ status: 401, body: hook }, { status: 302, body: hook },
    { status: 200, body: hook }, { status: 200, body: { job: { id: "test", state: "ERROR" } } }]) {
    const result = await execute(hook, [reply]);
    assert.equal(result.exitCode, 1);
    assert.equal(result.calls.length, 1);
    assert.ok(!result.logs.join("\n").includes("Rebuild accepted"));
  }
});

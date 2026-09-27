import assert from "node:assert/strict";
import { test } from "node:test";
import { deadlinePresentation } from "../../../src/lib/deadline-presentation.ts";

test("deadline cards omit missing text and retain ordinary dates without inventing times", () => {
  assert.equal(deadlinePresentation(), undefined);
  assert.equal(deadlinePresentation("  "), undefined);
  assert.deepEqual(deadlinePresentation("30 Sep 2026"), { label: "Closes", value: "30 Sep 2026" });
});

test("deadline cards preserve before versus by semantics without duplicate prefixes", () => {
  for (const input of ["Apply before 30 Sep 2026", "Before 30 Sep 2026"]) {
    assert.deepEqual(deadlinePresentation(input), { label: "Apply before", value: "30 Sep 2026" });
  }
  assert.deepEqual(deadlinePresentation("Apply by 30 Sep 2026"), { label: "Apply by", value: "30 Sep 2026" });
  assert.deepEqual(deadlinePresentation("Closes 30 Sep 2026"), { label: "Closes", value: "30 Sep 2026" });
  assert.deepEqual(deadlinePresentation("Deadline 30 Sep 2026"), { label: "Deadline", value: "30 Sep 2026" });
});

test("deadline cards retain exact times, timezones and source validity wording", () => {
  for (const value of ["2 Oct 2026, 23:59 UTC", "24 Sep 2026, 23:59 GMT+1"]) {
    assert.deepEqual(deadlinePresentation(value), { label: "Closes", value });
  }
  assert.deepEqual(deadlinePresentation("Apply before 2 Oct 2026, 23:59 UTC"), {
    label: "Apply before", value: "2 Oct 2026, 23:59 UTC",
  });
  assert.deepEqual(deadlinePresentation("Valid through 14 Dec 2026"), { label: "Valid through", value: "14 Dec 2026" });
});

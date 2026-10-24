import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NEWSLETTER_PROMPT_DISMISSAL_SUPPRESSION_MS,
  hasReachedNewsletterScrollThreshold,
  shouldShowAutomaticNewsletterPrompt,
} from "../../../src/lib/newsletter-prompt.ts";

test("automatic newsletter prompt is eligible for a new browser", () => {
  assert.equal(shouldShowAutomaticNewsletterPrompt({ now: 1_000 }), true);
});

test("automatic newsletter prompt stays suppressed after signup or within a session", () => {
  assert.equal(
    shouldShowAutomaticNewsletterPrompt({ now: 1_000, subscribed: true }),
    false
  );
  assert.equal(
    shouldShowAutomaticNewsletterPrompt({ now: 1_000, shownThisSession: true }),
    false
  );
});

test("dismissal suppresses the automatic prompt for fourteen days", () => {
  const dismissedAtMs = Date.UTC(2026, 9, 1);
  const dismissedAt = new Date(dismissedAtMs).toISOString();

  assert.equal(
    shouldShowAutomaticNewsletterPrompt({
      now:
        dismissedAtMs +
        NEWSLETTER_PROMPT_DISMISSAL_SUPPRESSION_MS -
        1,
      dismissedAt,
    }),
    false
  );
  assert.equal(
    shouldShowAutomaticNewsletterPrompt({
      now:
        dismissedAtMs +
        NEWSLETTER_PROMPT_DISMISSAL_SUPPRESSION_MS,
      dismissedAt,
    }),
    true
  );
});

test("malformed dismissal timestamps do not permanently suppress the prompt", () => {
  assert.equal(
    shouldShowAutomaticNewsletterPrompt({
      now: Date.UTC(2026, 9, 24),
      dismissedAt: "not-a-date",
    }),
    true
  );
});

test("scroll threshold uses the scrollable page distance", () => {
  const page = {
    viewportHeight: 1_000,
    documentHeight: 3_000,
  };

  assert.equal(
    hasReachedNewsletterScrollThreshold({ ...page, scrollY: 1_099 }),
    false
  );
  assert.equal(
    hasReachedNewsletterScrollThreshold({ ...page, scrollY: 1_100 }),
    true
  );
  assert.equal(
    hasReachedNewsletterScrollThreshold({
      scrollY: 0,
      viewportHeight: 1_000,
      documentHeight: 1_000,
    }),
    false
  );
});

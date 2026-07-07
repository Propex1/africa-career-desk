// Client-side analytics bootstrap. Runs once, before hydration.
// PostHog is only initialised when NEXT_PUBLIC_POSTHOG_KEY is present, so the
// site keeps working normally when the analytics env vars are missing.
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

if (key) {
  posthog.init(key, {
    api_host: host,
    // Capture page views on first load and on client-side route changes.
    capture_pageview: "history_change",
    capture_pageleave: true,
    // We only send the explicit, curated events defined in lib/analytics.
    // No autocapture and no session recording keeps the setup lean and avoids
    // collecting any personal data (emails, names, form values, etc.).
    autocapture: false,
    disable_session_recording: true,
    // Anonymous visitors are still counted (unique vs returning) via a cookie,
    // without creating person profiles unless a user is ever identified.
    person_profiles: "identified_only",
  });
}

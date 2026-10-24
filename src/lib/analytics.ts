// Small, reusable analytics helpers for the job board.
//
// Every helper is a no-op when PostHog is not configured (missing env vars) or
// when called on the server, so tracking can never break a page render.
// We deliberately only send curated, non-personal event properties.
import posthog from "posthog-js";
import type { BoardSection, Opportunity } from "@/types";
import type { NewsletterPromptContext } from "./newsletter-prompt";

type EventProps = Record<string, unknown>;

const enabled =
  typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

function capture(event: string, properties?: EventProps) {
  if (!enabled) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Analytics must never surface an error to the user.
  }
}

/** Shared, non-personal properties describing an opportunity. */
export function jobProperties(job: Opportunity): EventProps {
  return {
    jobId: job.id,
    slug: job.slug,
    title: job.title,
    company: job.company,
    boardSection: job.boardSection,
    roleType: job.roleType,
    seniority: job.experienceBucket,
    country: job.country,
    region: job.region,
    deadline: job.deadlineDisplay,
  };
}

export function trackJobCardClicked(job: Opportunity) {
  capture("job_card_clicked", jobProperties(job));
}

export function trackJobDetailViewed(job: Opportunity) {
  capture("job_detail_viewed", jobProperties(job));
}

export function trackApplyClicked(job: Opportunity) {
  capture("apply_clicked", jobProperties(job));
}

export function trackRelatedJobClicked(
  sourceJob: Opportunity,
  targetJob: Opportunity
) {
  capture("related_job_clicked", {
    ...jobProperties(targetJob),
    sourceJobId: sourceJob.id,
    sourceJobSlug: sourceJob.slug,
    sourceCompany: sourceJob.company,
    sourceRoleType: sourceJob.roleType,
  });
}

export function trackFilterUsed(
  filterType: string,
  filterValue: string,
  boardSection: BoardSection
) {
  capture("filter_used", { filterType, filterValue, boardSection });
}

export function trackSearchUsed(
  queryLength: number,
  boardSection: BoardSection,
  resultCount: number
) {
  // We intentionally send only the length of the query, never the raw text,
  // to avoid capturing anything a visitor might type (names, emails, etc.).
  capture("search_used", { queryLength, boardSection, resultCount });
}

export function trackSectionViewed(boardSection: BoardSection) {
  capture("section_viewed", { boardSection });
}

export type NewsletterDismissMethod =
  | "close_button"
  | "not_now"
  | "backdrop"
  | "escape";

function newsletterProperties(
  context: NewsletterPromptContext,
  additional?: EventProps
): EventProps {
  return {
    ...context,
    promptVersion: "engagement_v1",
    pagePath:
      typeof window !== "undefined" ? window.location.pathname : undefined,
    ...additional,
  };
}

export function trackNewsletterCtaClicked(
  context: NewsletterPromptContext
) {
  capture("newsletter_cta_clicked", newsletterProperties(context));
}

export function trackNewsletterPromptViewed(
  context: NewsletterPromptContext
) {
  capture("newsletter_prompt_viewed", newsletterProperties(context));
}

export function trackNewsletterPromptDismissed(
  context: NewsletterPromptContext,
  dismissMethod: NewsletterDismissMethod
) {
  capture(
    "newsletter_prompt_dismissed",
    newsletterProperties(context, { dismissMethod })
  );
}

export function trackNewsletterSignupSubmitted(
  context: NewsletterPromptContext
) {
  capture("newsletter_signup_submitted", newsletterProperties(context));
}

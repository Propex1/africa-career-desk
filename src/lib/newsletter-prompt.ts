export const NEWSLETTER_PROMPT_DISMISSED_AT_KEY =
  "acd_newsletter_popup_dismissed_at";
export const NEWSLETTER_SUBSCRIBED_KEY = "acd_newsletter_subscribed";
export const NEWSLETTER_PROMPT_SHOWN_SESSION_KEY =
  "acd_newsletter_popup_shown";

export const NEWSLETTER_PROMPT_OPEN_EVENT = "acd:newsletter-open";
export const NEWSLETTER_PROMPT_PREPARE_EVENT = "acd:newsletter-prepare";

export const NEWSLETTER_PROMPT_DISMISSAL_SUPPRESSION_MS =
  14 * 24 * 60 * 60 * 1000;
export const NEWSLETTER_AUTO_PROMPT_DELAY_MS = 40_000;
export const NEWSLETTER_AUTO_PROMPT_MIN_PAGE_AGE_MS = 12_000;
export const NEWSLETTER_AUTO_PROMPT_SCROLL_THRESHOLD = 0.55;

export type NewsletterPlacement =
  | "banner"
  | "about_trigger"
  | "automatic_popup";
export type NewsletterPromptTrigger = "manual" | "timer" | "scroll";

export interface NewsletterPromptContext {
  placement: NewsletterPlacement;
  trigger: NewsletterPromptTrigger;
}

interface NewsletterAutoPromptState {
  now?: number;
  dismissedAt?: string | null;
  subscribed?: boolean;
  shownThisSession?: boolean;
}

export function shouldShowAutomaticNewsletterPrompt({
  now = Date.now(),
  dismissedAt,
  subscribed = false,
  shownThisSession = false,
}: NewsletterAutoPromptState): boolean {
  if (subscribed || shownThisSession) return false;
  if (!dismissedAt) return true;

  const dismissedAtMs = Date.parse(dismissedAt);
  if (!Number.isFinite(dismissedAtMs)) return true;

  return now - dismissedAtMs >= NEWSLETTER_PROMPT_DISMISSAL_SUPPRESSION_MS;
}

interface NewsletterScrollProgress {
  scrollY: number;
  viewportHeight: number;
  documentHeight: number;
}

export function hasReachedNewsletterScrollThreshold(
  { scrollY, viewportHeight, documentHeight }: NewsletterScrollProgress,
  threshold = NEWSLETTER_AUTO_PROMPT_SCROLL_THRESHOLD
): boolean {
  const scrollableDistance = Math.max(documentHeight - viewportHeight, 0);
  if (scrollableDistance === 0) return false;

  return scrollY / scrollableDistance >= threshold;
}

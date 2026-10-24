/**
 * Development is always enabled. Preview and Production require this explicit
 * public flag, so either environment can be disabled without a code change.
 */
export const NEWSLETTER_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED === "true";

/**
 * The engagement-triggered prompt is enabled whenever the newsletter is
 * enabled, unless an environment explicitly disables only the automatic prompt.
 * This provides a production rollback without removing manual signup surfaces.
 */
export const NEWSLETTER_AUTO_PROMPT_ENABLED =
  NEWSLETTER_ENABLED &&
  process.env.NEXT_PUBLIC_NEWSLETTER_AUTO_PROMPT_ENABLED !== "false";

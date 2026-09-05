/**
 * Development is always enabled. Preview and Production require this explicit
 * public flag, so either environment can be disabled without a code change.
 */
export const NEWSLETTER_ENABLED =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED === "true";

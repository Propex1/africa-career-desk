import type { NextRequest } from "next/server";
import { ENABLED_JOB_COUNTRY_PAGES } from "./data/job-countries.ts";

// Reject unapproved spellings before static-file lookup. Case-insensitive local
// filesystems can otherwise alias a rejected slug onto an approved prerender.
export function proxy(request: NextRequest) {
  const match = /^\/jobs\/country\/([^/]+)\/?$/.exec(request.nextUrl.pathname);
  if (!match || !ENABLED_JOB_COUNTRY_PAGES.some(({ slug }) => slug === match[1])) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
    });
  }
}

export const config = { matcher: "/jobs/country/:path*" };

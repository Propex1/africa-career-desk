# Country discovery — Batch 4

The editorial allowlist in `src/data/job-countries.ts` enables only South Africa,
Morocco and Kenya. Inventory never enables another country. One static dynamic
route, `/jobs/country/[slug]/`, renders the existing JobCard design. Unapproved
slugs return 404 and receive no country canonical, sitemap entry or detail link.
The narrowly matched `src/proxy.ts` guard checks this same allowlist before static
file lookup. This prevents case variants from aliasing or corrupting approved
prerenders on case-insensitive Windows filesystems. It applies only to the country
route subtree; it does not intercept existing boards, category or detail pages.

## Membership and refreshes

Country pages consume the same `JOBS` export as the main board. The shared
`filterJobsForCountry` selector keeps live Jobs only, excludes removed/closed
records, deduplicates stable IDs and preserves board order and original records.
It does not change primary categories, discovery themes or lifecycle rules.

Country identity comes only from existing location fields:

1. When `locations` is non-empty, use countries explicitly named in `city`,
   `country` or `multi_market` entries. Regional entries do not establish work
   locations, even when they list covered countries. If the legacy `country`
   field is present, all its named countries must agree with those concrete
   locations; a conflict excludes the record. A multi-country legacy field can
   corroborate this list but cannot add membership.
2. Without `locations`, accept a single structured `country` only when the
   location display corroborates it: exact country, exact structured city, or
   a comma-separated display ending with that country. Slash/semicolon/or,
   multiple-country and multi-country wording fails this conservative fallback.
   Display text never supplies or infers a country. A city-only display can
   corroborate the existing country field, as in older Casablanca records.
3. Employer identity, headquarters, region, mandate, descriptions and language
   never establish membership. A missing country with no concrete locations
   stays unmatched. No per-job exception list is used.

Explicit structured alternatives can match more than one approved country.
The same selector supplies contextual links on individual Job pages. Unsupported
countries do not receive links or routes.

Each subsequent build recomputes membership and counts from `JOBS`, including
future additions, removals and verified expiry. There are no country-specific
Job IDs, counts, employer lists or category lists in rendering or matching code.
The initial projection on 28 September 2026 contains 28 South Africa, 28 Morocco
and 5 Kenya Jobs. These are an audit snapshot, not configuration.

ACD-0166 has explicit Cape Town and Johannesburg locations and matches South
Africa once. ACD-0250, ACD-0231 and ACD-0204 have alternative locations only in
legacy/display text, without reliable structured alternatives. ACD-0035 has a
Kenya field conflicting with its "Multiple countries" display. All four remain
excluded. Correcting their underlying evidence in a separately approved refresh
can automatically change membership; this batch does not edit opportunity data.

## Presentation and SEO

Each page uses the category-page layout, normal header and shared cards, with a
country H1, one concise editorial intro, derived count and All Jobs link. Copy is
editorial and can be reviewed when inventory changes; it is not a membership rule.
No top-navigation menu, employer pages or country/category combinations are added.

Metadata uses unique country titles/descriptions with matching Open Graph and
Twitter fields and a trailing-slash canonical. The allowlist also supplies the
sitemap. Approved pages stay indexable and in the sitemap at low/zero inventory,
showing a restrained empty state when needed. Country lists emit no JobPosting
or other added JSON-LD. Existing eligible Job detail schema is unchanged.

Updates become visible on the next build/release; this does not enable runtime
refreshing or activate the opt-in Batch 3 production-freshness workflow.

## Local validation — 28 September 2026

- Full working-tree ACD suite: 117 passed, including 16 country tests. The suite
  still includes the five pre-existing unrelated research/import tests; their
  files are not part of Batch 4.
- TypeScript and production build passed (102 generated pages). Full lint has
  zero errors and 23 pre-existing runtime-script warnings; all Batch 4 TypeScript
  files pass targeted lint without warnings. Tracked and new-file whitespace
  checks passed.
- Desktop 1440px and mobile 390px: all three pages passed exact membership,
  original category badges, metadata, canonical, normal navigation, shared-card
  styling, All Jobs navigation, representative detail links and overflow checks.
  Screenshots were visually reviewed locally, without adding public assets.
- All 82 live detail pages passed expected country-link and unchanged JobPosting
  checks. Existing category memberships remain 16 / 4 / 21 / 16 / 7, and the
  main PE filter retains the same 16 IDs. Sitemap contains 94 unique URLs.
- Unapproved countries and case variants return 404; approved pages remain 200
  after those requests. The scoped request guard fixes the case-insensitive
  Windows prerender collision found during QA. No browser JavaScript exceptions.
- Inventory remains 82 Jobs / 12 Programmes / 17 Open Applications / 189 records.
  All 31 unrelated local changes are byte-identical. Nothing staged, committed,
  pushed or deployed; Batch 3 remains disabled.

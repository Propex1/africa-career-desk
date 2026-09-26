# Africa Career Desk

## Local discovery review

The public Next.js site remains static. The semi-automated employer discovery and editorial review companion is local-only; see [the discovery guide](docs/africa-career-desk-discovery.md) for commands and operational details.

Curated Africa finance and investment careers — private equity, DFI, infrastructure, venture capital, climate finance and strategy.

Built with Next.js 16 (App Router), TypeScript, and Tailwind CSS v4. Fully static — no database, no backend.

---

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Edit opportunities

All job data lives in one file:

```
src/data/opportunities.ts
```

Each entry follows the `Opportunity` type defined in `src/types/index.ts`.

**Minimum required fields to publish a role:**

| Field | Description |
|---|---|
| `id` | Unique ID, e.g. `"ACD-0056"` |
| `slug` | URL slug — lowercase, hyphens only |
| `title` | Job title |
| `company` | Company name |
| `companyInitials` | 2–3 letter initials used as logo fallback |
| `boardSection` | `"Jobs"`, `"Programmes"`, or `"Open Applications"` |
| `roleType` | Role category shown as the primary tag |
| `locationDisplay` | Display string shown on cards and detail pages |
| `summary` | Concise factual description |
| `applyUrl` | Direct official application or instructions URL |
| `sourceUrl` | Where the listing was verified |
| `sourceType` | `"Company website"`, `"Official ATS"`, `"LinkedIn company post"`, `"Email application"`, or `"Trusted third-party"` |
| `applyButtonText` | Button label, e.g. `"Apply on company site"` |
| `publishedAt` | Immutable first-publication date, `YYYY-MM-DD`; omit only for older entries whose date is not reliable |
| `lastChecked` | Date string, e.g. `"23 Jun 2026"` |
| `status` | Always `"Active"` |

The public projection resolves `employerId` from exact labels in
`src/data/employer-identities.ts`. Unresolved or combined employer labels stay
unmapped; do not force a parent/subsidiary identity. `publishedAt` remains the
ACD publication date and must never be copied into `employerPostedAt`.

**Optional fields — only include when clean and verified:**

| Field | Notes |
|---|---|
| `experienceBucket` | One of: `Analyst`, `Associate`, `Mid-level`, `Senior`, `Leadership`, `Intern / Graduate` |
| `language` | Full display string, e.g. `"English; French required"` |
| `languageTags` | Clean tags for filtering, e.g. `["English", "French"]` |
| `deadlineDisplay` | Formatted date string, e.g. `"30 Jun 2026"`. Omit if not verified. |
| `city` | Omit if the role covers multiple cities or has no specific city |
| `country` | Omit if the role is regional/remote |
| `region` | One of the values used in the existing data |
| `logoUrl` | Company logo URL. If omitted, `companyInitials` is shown instead. |
| `employerPostedAt` | Verified employer/source posting date as `YYYY-MM-DD`; omit unless the source states the date explicitly |
| `deadlineDate` | Optional normalized deadline as `YYYY-MM-DD`; only exact, unambiguous `deadlineDisplay` dates are normalized |
| `locations` | Optional array with `city`, `country`, `region`, or `multi_market` scope; do not infer a work location from employer headquarters |
| `workArrangement` | Optional verified `onsite`, `hybrid`, or `remote` value |
| `employmentType` | Optional verified controlled value such as `full-time`, `contract`, or `internship`; retain source wording in `employmentTypeDisplay` when useful |

**Public copy rules:**
- Never show salary, N/A, Unknown, or empty placeholders.
- If no verified deadline, omit `deadlineDisplay` — the deadline line hides itself.
- Use `Experience`, not `Seniority`, for the experience field label.
- `languageTags` must be clean single-language strings (`"English"`, `"French"`, etc.).
- Jobs and Programmes need a verified, role-specific description with enough detail for a useful detail page. Do not publish a generic one-sentence listing label; add `aboutRole`, responsibilities and requirements where the official source supports them.
- Open Applications may use shorter, purpose-specific copy because they are not individual vacancies.
- For Open Applications, make the primary action the official webpage containing the application instructions whenever one exists. Mention the official email address in the copy when relevant; use a `mailto:` action only when no official instructions webpage is available, and state that limitation clearly.
- For Jobs and Programmes, click through the employer's careers index to the individual official listing before publishing. Use that role-specific page for the application URL, factual source, description, responsibilities, requirements, contract type and deadline. A generic careers or vacancies index does not satisfy publication readiness; if no individual page exists, record that limitation instead of presenting the index as a direct listing.
- During publication preparation, set `publishedAt` once to the actual ACD publication day (`YYYY-MM-DD`) using `withFirstPublicationDate`. Never replace an existing value when editing, rechecking or correcting a listing. The public listings sort dated entries newest first, preserve stable same-date/source order, and show a `New` badge for the first seven calendar days only.
- Keep every removed job record in the static `OPPORTUNITIES` collection and its ID in `REMOVED_JOB_IDS`. The derived `publicationStatus` and `lifecycleStatus` distinguish live, needs-verification, and closed records. A passed or unparseable deadline without verified hard-deadline provenance requests verification; it does not automatically remove a role from `JOBS`.
- Automatic deadline expiry is allowed only for IDs in the verified hard-deadline evidence map in `src/data/opportunities.ts`. The stated deadline date is inclusive through 23:59:59 UTC; expiry starts on the following UTC calendar date. A deadline display string or normalized date without verified employer/official-ATS provenance does not expire a job. A newer verified extension replaces the current evidence-map entry.
- Because the public site is statically pre-rendered, the expiry projection changes on the next production build/deployment after the UTC deadline date, not through a runtime timer. The opt-in [daily production freshness workflow](docs/production-freshness.md) requests a rebuild at 01:17 UTC once configured.
- The local ignored SQLite database is a review aid, not the authoritative public history. Version-controlled opportunity records and the expiry audit preserve the checked-in publication history; do not delete removed records to clean the live board.

The R1 reconciliation combines the approved editorial history through `f0dade0`
with the accepted SEO/lifecycle work. See `docs/audits/2026-09-26-r1-reconciliation.json`
for the commit ledger, stable-ID inventory and reviewed deadline evidence.
ACD-0139's approved 23 September reactivation supersedes its earlier closure;
ACD-0170 remains historical but is excluded from live Programmes. JobPosting
`validThrough` uses the same verified deadline provenance gate as automatic expiry.
Run `npm run acd:test` for the discovery, SEO, category and lifecycle suites together.

After editing, run `npm run build` to confirm TypeScript is clean and all 48+ pages pre-render.

---

## Deploy to Vercel

This is a static Next.js site. No server or database is required.

For automatic expiry updates, configure [daily production freshness](docs/production-freshness.md).
It rebuilds the approved production Git branch; it never runs discovery or publication tooling.

**Steps:**

1. Push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel auto-detects Next.js — no build settings need to be changed.
4. Click **Deploy**.

**For preview builds**, add this environment variable in Vercel:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SHOW_DEMO_NOTICE` | `true` |

This shows an amber banner at the top of every page: *"Preview build — not for public distribution."*

Leave it unset (or set to `false`) for production deployments.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SHOW_DEMO_NOTICE` | No | Set to `true` to show a preview banner. Default: hidden. |

See `.env.example` for the template.

---

## Newsletter / Weekly Alerts

Not implemented in V1. The header button and newsletter strip have been removed.

Add a new newsletter or alerts component later once an email provider is selected (Mailchimp, ConvertKit, Resend, etc.). There is no legacy component to update — start fresh when ready.

---

## Tech stack

| | |
|---|---|
| Framework | Next.js 16.2.9 (App Router, pre-rendered pages) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (CSS-based config via `@theme`) |
| Fonts | Newsreader (serif) + IBM Plex Sans (sans) via `next/font/google` |
| Hosting | Vercel |

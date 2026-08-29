# ADR 001: Local SQLite discovery review tool

## Context

Africa Career Desk is a static Next.js website. Discovery needs durable state, a human review step and source-level auditability, but it must not create a public route or require paid infrastructure.

## Decision

Use a standalone TypeScript Node process in `tools/acd/`, SQLite through Node's supported `node:sqlite` module, and version-controlled SQL migrations. The review interface is served only on `127.0.0.1` by a small HTTP server and is not part of `src/app` or the Vercel deployment.

Source adapters write raw evidence and factual fields first. Normalisation, duplicate detection and recall-oriented classification run afterwards. Reviewer decisions are persisted separately from source records. A publication manifest is an explicit generated artifact; it never edits `src/data/opportunities.ts`.

## Consequences

The system is inexpensive, works offline after a collection run, and can grow to many employers and sources. It intentionally has no automatic publishing or removal path. SQLite is local to one reviewer, so shared multi-user review would be a future architecture decision.

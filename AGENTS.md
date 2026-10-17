<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Working-tree safety

- Treat all pre-existing modified and untracked files as user-owned work.
- Check `git status --short` before making changes and preserve the initial state.
- Do not modify, delete, restore, overwrite, stage or commit pre-existing changes unless the current task explicitly requires changes to those exact files.
- Stage only the specific files required for the current task.
- Never use `git add .` or `git add -A`.
- After completing a task, report the files changed and the validation performed.
- Do not commit or push unless I explicitly authorize it.

## Africa Career Desk product principles

- Build for long-term editorial quality, trust and maintainability from the perspective of Africa Career Desk users.
- Keep workflows clear, efficient, accessible, responsive and consistent; prefer reliable, modern, well-supported methods.
- Prioritise official, verifiable sources and never hide uncertainty, failed sources or incomplete coverage.
- Keep discovery and selection separate, optimise discovery for recall, and require human approval before publication or removal.
- Avoid unnecessary complexity, but do not create clear long-term technical debt for a short-term gain.

## Job descriptions and Apply links

- Follow `docs/job-description-standard.md` for all new or revised listings. Use the Africa50 DRE Associate page as the model; keep distinct summary and role context, detailed evidenced responsibilities and requirements, and short application notes.
- Before choosing an Apply link, look for and verify the same job's official employer detail page. Preserve original owner notes and record any new destination separately.
- Run `npm run acd:content:check` after content changes. Never pad sparse sources or convert editorial improvements into publication authorization.

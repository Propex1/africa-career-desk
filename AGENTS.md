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

# EBRD closure precedence draft — Issue10

Based on public main `bc2b48339883e95346e4e6288f2d810e6096e579`. No lifecycle data, workflow, schedule, production gate or listing changes.

Official role1397868933 was inspected in the rendered browser on15October2026 Europe/Zurich. Its main ancestor is `div#content[role=main]`; selected captured fragments are `h1#job-title` with the exact role title and a paragraph/strong statement that the position has been filled. The fixture records these observed fragments, not a full HTTP-body capture.

The draft accepts that explicit filled/no-longer-available template only on EBRD's exact job-detail route, with an exact matching role heading inside bounded main content. Footer messages, a different title, generic board route or redirect cannot authorize closure. A retained generic alert/application form does not override the role-bound closure message. A separately open application page/API cannot overwrite a closed detail result; confirmation of the same closure remains mandatory before lifecycle events are proposed.

Focused regression tests cover retained forms, different-role and footer messages, generic redirects, conflicting Apply pages and failed second confirmation. Existing production locks, removal caps and approvals remain intact. No production replay or workflow dispatch was performed. This branch is for review only; merging/activation remains outside current authorization.

## Additional coordinator review checks

Six additional cross-provider regressions cover existing BII closed, JazzHR filled and JazzHR paused detail classifications against separately open Apply HTML and an exact open Workday API. Both successful and failed confirmation paths are covered; failed confirmation produces no closure event. All nine focused tests pass. These fixtures exercise transport-independent decision logic, not newly captured real employer responses.

A real read-only replay through the unmodified lifecycle `reader` was attempted on 14 October 2026 23:06 UTC for the official EBRD Abidjan role. It returned `Source inaccessible or redirect budget exhausted`, no HTTP status/body/hash, and correctly classified UNCERTAIN. Therefore actual HTTP parser compatibility is still unproven; the browser DOM fixture is not substituted for that missing replay. No proxy, safety or transport settings were bypassed.

The three broader projection checks remain blocked by the missing existing TypeScript5.9.3 dependency. The pinned version was confirmed in the public lockfile; installing that dependency into the isolated QA copy with lifecycle scripts disabled was rejected by network policy for registry.npmjs.org. No dependency was installed and no manifest/lockfile was changed. Re-run the complete lifecycle suite in an existing correctly provisioned checkout/CI before accepting the draft; do not activate it based only on the nine focused tests.

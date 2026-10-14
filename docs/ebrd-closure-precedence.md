# EBRD closure precedence draft — Issue10

Based on public main `bc2b48339883e95346e4e6288f2d810e6096e579`. No lifecycle data, workflow, schedule, production gate or listing changes.

Official role1397868933 was inspected in the rendered browser on15October2026 Europe/Zurich. Its main ancestor is `div#content[role=main]`; selected captured fragments are `h1#job-title` with the exact role title and a paragraph/strong statement that the position has been filled. The fixture records these observed fragments, not a full HTTP-body capture.

The draft accepts that explicit filled/no-longer-available template only on EBRD's exact job-detail route, with an exact matching role heading inside bounded main content. Footer messages, a different title, generic board route or redirect cannot authorize closure. A retained generic alert/application form does not override the role-bound closure message. A separately open application page/API cannot overwrite a closed detail result; confirmation of the same closure remains mandatory before lifecycle events are proposed.

Focused regression tests cover retained forms, different-role and footer messages, generic redirects, conflicting Apply pages and failed second confirmation. Existing production locks, removal caps and approvals remain intact. No production replay or workflow dispatch was performed. This branch is for review only; merging/activation remains outside current authorization.

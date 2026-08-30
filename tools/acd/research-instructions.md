# ACD employer research handoff

Use the immutable `research-task.json` as the only source of scope. Research one employer at a time and save one `results/<employer-id>.result.json` file using `EmployerResearchResult` v1.1. Legacy v1.0 files remain readable, but new research must use the structured v1.1 schema.

## Evidence rules

- Check the sources listed for that employer and record additional official, authorised, or discovery sources separately when found. Do not infer an official listing from a search-result URL.
- Record exactly one `task` observation for every task source. Additional observations must have unique IDs and must not alter the immutable task snapshot. Use `not_checked`, `inaccessible`, or `partially_checked` honestly; never mark coverage complete when a required source is unobserved or a coverage dimension has a material limitation.
- Use `checked_openings_found` only with an official evidence URL. Use `checked_no_openings` only after checking that specific source.
- For every Job or Programme found on an official careers index, click through `View job`, `View & Apply`, the job title, or the equivalent control before recording it. Store the role-specific official listing or application URL as the candidate's application URL and use it to capture the description, responsibilities, requirements, contract type and deadline.
- A generic careers, vacancies or recruitment index is discovery evidence, not a direct Job or Programme application destination. If the official source genuinely exposes no individual page, record that limitation and do not present the index as a direct listing. Open Applications are different: their official instructions page may correctly remain the primary action.
- When a validated, approved record is prepared for the public-site preview, record its first ACD publication date once as `publishedAt` in `YYYY-MM-DD` form. Preserve that date through factual corrections and rechecks: it controls the permanent newest-first ordering and seven-calendar-day `New` badge on every public listing.
- Record possible active candidates with their editorial classification, freshness, application-route status, factual gaps, duplicate evidence, and evidence quality. They are not live ACD vacancies and this handoff does not publish or import them.
- Keep expired or closed findings out of `activeCandidates` and record their closure evidence separately.
- Use `completed_with_limitations` with a clear structured coverage reason whenever coverage is limited. Inaccessible or partial LinkedIn coverage is a limitation, not evidence of zero vacancies.

## Resume rules

- Do not change `research-task.json`; it is an immutable snapshot.
- Results are independent per employer. A missing result is pending work; an existing valid result must be retained.
- Run `npm run acd:research:validate -- --batch-run <id>` before handing results back. Validation does not modify the database or import opportunities.

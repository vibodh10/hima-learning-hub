# Mini-learning redesign: completion audit

Source: user goal-objective.md, attachment 12e77b2b-f475-499e-95c2-111bbebe3777. This checklist preserves the full goal; a passing build alone is not completion.

## Intended experience

Student: teacher-assigned unit only → basic starting point → one short explanation and example → one or two questions (including matching) → feedback → daily reward and finished screen. On the next learning day, recap the last completed idea before a new one. No student progress dashboard or assignment administration. Teacher: starting point, current evidence, targets and intervention needs, scoped to their own group.

Privacy: retain existing records; collect no new personal background or free-text sensitive information for mini-learning. Authentication and a teacher roster still require a learner identifier; do not claim the platform holds no student information.

## Required evidence (not yet complete)

- [ ] Starting point: basic, one question at a time; existing baseline retained and distinct instruments labelled honestly.
- [ ] Daily self-study: only one assigned short step; completion and next-day boundary enforced on the server.
- [ ] Recap: last completed step, including gaps/weekends; no invented prior evidence.
- [ ] Content correctness: primary Pearson/W3C sources, specific definitions/examples, reviewed answers.
- [ ] Randomisation: question/options/pair order changes without breaking marking; answers not shipped in initial payload.
- [ ] Match pairs: keyboard/touch usable, unique options, correct and incorrect cases.
- [ ] XP: server-authoritative, genuine completion, retry/concurrent-tab idempotency, existing balances retained.
- [ ] Badges: persisted milestone awards, no duplicates, truthful feedback.
- [ ] Progression: starting-point-informed support, no student unit selection, not a qualification grade.
- [ ] Merit analysis: short cause/effect/comparison scaffolding.
- [ ] Distinction evaluation: short evidence/limitation/judgement scaffolding.
- [ ] Teacher reporting: first-attempt evidence, recap versus new-learning distinguished, class isolation.
- [ ] Targets/interventions: automatic from genuine mini-learning evidence, not teacher data-entry burden.
- [ ] Privacy: minimum data, scoped reads and writes, no new sensitive background fields, accurate notice.
- [ ] Mobile/desktop: browser-tested student and teacher journeys, readable contrast and 200% text.
- [ ] Broken controls/links/edge cases: signed out, no group, unavailable content, duplicate submissions, offline/error retry, refresh/resume, day changes.
- [ ] Full end-to-end QA and retest on isolated test records; preserve real learner evidence.
- [ ] Deployment and post-deployment checks for the exact validated version.

## Baseline evidence

2026-09-08: deployed 75568bf adds Units 5/11/16 and simpler legacy teaching wording. 368 existing tests passed, two additional content regressions passed, build/lint passed, isolated shared-unit setup and assigned-unit SQL checks passed; public production checks passed. These checks do NOT prove this full redesign.

## Redesign implementation checkpoint (local, not deployed)

2026-09-08: added `/study` and a single-card player, four-question Unit 6 mini baseline, six original Unit 6 theory steps, separate recap grading, first-answer preservation, daily limits and transactional achievement-point/badge awards. Added a class-scoped teacher self-study report with automatically derived targets. Source and question snapshots are server-side; public question payloads omit answer keys. Production migration `202609080001_mini_study.sql` has NOT been applied.

Evidence so far:

- 25 focused tests passed across pure rules/content, student interaction, authenticated actions and teacher summary models.
- `mini_study.sql` passed in the isolated local PostgreSQL database: assigned-unit checks, private answer keys, immutable grades, feedback-before-reward, same-day limit, duplicate XP/badge prevention, teacher own-group reads and unpublished-group denial.
- Production build passed; focused lint passed. A later feedback-loading label fix requires the next final build to include it.
- Actual browser preview tested at 390×844 and 1280×900: one-card lesson, wrong matching and wrong choice, helpful feedback, completed screen, four-question baseline including “not sure”, recap before the next lesson and correct matching. Explicit control labelling was fixed after browser testing.
- Browser preview is development-only and changes no learner records. It is NOT evidence of a full signed-in journey against the database.
- Full suite initially hit a test transition race plus three worker-start timeouts. Fixed the test to await the settled feedback button and corrected the transient UI label. The reduced-worker full rerun passed: **395 passed, 3 skipped**, 99 passing test files, no worker errors (158 seconds). The failed earlier run remains a failed run.
- Extended isolated SQL verification passed for next-day access and denial of another teacher's reads. Browser recap → new idea → both checks → three feedback cards → completion was also verified after the transition fix.

Required next work, without shrinking the original goal:

1. Complete short, accurate content for the assigned units; Unit 6's initial six steps are not its complete theory provision. Add specific accessibility/usability examples, with primary sources.
2. Connect the minimal flow as the actual student entry point and retire student-facing progress/portfolio/unit-choice routes appropriately, while preserving teacher access and existing records. At present the legacy dashboard remains the entry point.
3. Expand teacher integration: self-study report is a dedicated route, not yet the default group summary; reconcile old automatic targets/attention with new evidence so teachers receive no contradictory messages.
4. Verify existing full-unit baselines inform support honestly; prevent a transferred learner taking another mini baseline for the same unit. Review multi-group selection/resume and class changes.
5. Add raw discrete response identifiers to auditable evidence if needed; never collect personal background/free-text sensitive information.
6. Complete full authenticated end-to-end testing on isolated records (including teacher group creation and selection), teacher mobile/desktop, 200% text, refresh/offline/duplicate tab/day boundary, empty/missing data, privacy and exports. Separate preview tests from real persistence tests.
7. Final full tests, build, migration/deployment, then post-deployment verification. Do not publish this incomplete redesign or mark the goal complete based only on the foundation checks above.

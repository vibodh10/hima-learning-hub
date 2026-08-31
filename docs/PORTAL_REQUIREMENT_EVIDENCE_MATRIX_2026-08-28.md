# Portal requirement evidence matrix

Last verified: 31 August 2026

This matrix tests the current worktree against every numbered section of the
teacher-led portal brief. **Proven locally** means the implementation and a
proportionate local verification exist. **Partial** means the architecture or a
bounded pilot exists but the full product claim would be broader than the evidence.
**External** means the repository cannot prove the deployed operational state.

| Brief requirement | Current status | Authoritative evidence | Remaining proof or work |
| --- | --- | --- | --- |
| 1. Simple teacher workflow | Partial; deployed foundation and corrected Auth URL proven | Teacher next-action projection; class creation, active unit selection, publishing, invitation ledger and automatic first-student journey activation in `src/app/dashboard/page.tsx`, `src/app/teacher/classes/[id]/page.tsx` and migrations `202608270001`–`202608270003`. Production `/api/release` returned exact commit `574394cf8884d7dc1cb87c2f0fc9cf15c19dc9e7` on 31 August 2026. The live Auth URL gate passed after correction, and a replacement controlled-student email was recorded as sent. | Open only the newest controlled email and complete the hosted acceptance journey before inviting real learners. |
| 2. Course → Unit → Module → Lesson → Activity | Proven locally for the existing curriculum | Reusable relational hierarchy remains intact; official Pearson topics are presented as modules by `src/app/curriculum/page.tsx`, `src/components/atom-topic-hub.tsx` and `src/lib/learning-catalog.ts`. | Expand only centre-approved content; the portal must not invent missing T Level material. |
| 3. Short, doing-led teaching with no video lessons | Proven locally for the active guided experience | `src/components/topic-explainer.tsx` now provides learner-paced text, examples and a quick check without autoplay or video controls. Short lesson cards lead into adaptive questions and worksheets. Its component test enforces the no-video contract. | Tutor/content-owner review of the wording and qualification accuracy remains necessary before broad publication. |
| 4. Mastery through varied repetition | Proven locally for supported activities | The adaptive submission engine, skill mastery records, retrieval schedules, pathway thresholds and versioned Atom question banks require repeated independent evidence rather than one completion. | Continue coverage unit by unit only where approved questions and mark schemes exist. |
| 5. Starting-point assessment and evidence | Proven locally | Existing course and unit starting-point assessment kinds, secure assessment instances, skill results, comparisons, automatic proposed targets and teacher projections are reused. The student dashboard now confirms the learner's exact group and course immediately before the required next action. | A hosted journey should confirm the first invited learner sees the correct group and then completes the expected starting point. |
| 6. Automatic meaningful progress tracking | Proven locally | Immutable attempts/answers, allocation IDs, curriculum module position, lesson/activity continuation, mastery, misconceptions, paper evidence, dates and bounded active time are stored. Opening content alone is not treated as completion. | Production-volume and retention behaviour remain operational checks rather than repository claims. |
| 7. Evidence trail | Proven locally | Learner overview/evidence pages and the report projections join starting points, learning, attempts, misconceptions, feedback, learner response, improvement, targets, interventions and assessment evidence within an exact class/unit scope. | Real tutor review should identify whether any already-stored evidence needs a clearer presentation. |
| 8. Editable teacher-controlled targets | Proven locally | Target creation, approval, editing, review statuses, dates, success measures and audit facts use hardened functions; automatic targets remain proposed until teacher action. | None for the local foundation. |
| 9. Automatic and teacher feedback | Proven locally | Question feedback/explanations, formative-response review, paper review, teacher feedback, return-for-practice state and follow-up comparison are implemented and reportable. | Validate the speed and wording of the teacher review interaction with tutors. |
| 10. Teacher intervention dashboard | Proven locally | Exact-class `class_learner_attention`, teacher next action, “Who needs me?” and the seven-column curriculum table surface interventions, catch-up, overdue targets/required work, repeated low attempts and declining comparable evidence with drill-through links. | The portal deliberately does not infer attendance, motivation or inactivity from elapsed time alone. An authorised attendance integration would be needed for attendance-based alerts. |
| 11. Private individual learner profile | Proven locally | Server role checks, RLS, exact-class evidence scoping and the learner overview/evidence pages expose curriculum, progress, strengths/needs, targets, feedback, history and comparisons only to the learner or authorised staff. | Hosted cross-role smoke testing remains desirable. |
| 12. Evidence-led learner, class and unit reports | Proven locally | Private non-cached PDF/CSV routes exist for a learner, whole class and selected unit. Projections use stored facts, preserve missing states and fail closed on query errors or unsafe truncation. Render fixtures cover professional pagination. | Reports organise evidence but do not claim to guarantee Ofsted compliance; real-tutor review remains outstanding. |
| 13. Whole-class curriculum table | Proven locally | `src/lib/class-curriculum-overview.ts` and `src/components/class-curriculum-overview-table.tsx` implement the exact seven columns, active-unit assessment rules, explicit missing states and class-preserving learner links. | None for the local foundation. |
| 14. Simple student experience and exact continuation | Proven locally | `StudentEnrolmentSummary`, `selectStudentNextAction`, the primary Continue card, server-backed curriculum position and database activity continuation show the assigned group, prioritise one truthful next action and restore the latest incomplete position. | Hosted acceptance-to-first-action smoke testing remains outstanding. |
| 15. Professional motivation | Proven locally | Progress, mastery, AP levels, badges and private achievements are visible without public learner rankings; language and styling target FE learners. | Usability judgement ultimately needs learner observation. |
| 16. Fresh operational state | Proven in the deployed dashboard on 31 August 2026 | Hosted curriculum seed is separated from fictional disposable development/test seeds; runtime empty states use real counts and do not generate learners or outcomes. After the explicitly authorised removal of two test groups and the Vibodh test learner, production showed five genuine timetable groups, 0 students, 0 active enrolments and 0 completed assessments. | Preserve the empty-state boundary until genuine learners accept invitations. Recheck immediately before learner release. |
| 17. Genuine teacher/student separation | Proven locally; anonymous hosted boundary and exact deployed revision proven | `user_profiles.role`, server-side `requireRole`, action-level permission checks, RLS and revoked direct DML enforce the boundary. Role/permission tests and clean-database journeys exercise rejected access. Public browser checks confirmed anonymous users receive no admin, teacher-class, learner-progress or dashboard content. Production identifies exact commit `574394cf8884d7dc1cb87c2f0fc9cf15c19dc9e7`. | Run the hosted student-versus-teacher URL checks with distinct controlled accounts after password setup succeeds. |
| 18. Progressive extension, not rebuild | Proven locally | The implementation retains Next.js App Router, Supabase Auth/RLS, the assessment engine and the reusable curriculum schema; migrations extend rather than replace stored identities or evidence. | Continue as bounded, verified slices; do not bulk-generate unsupported curriculum. |

## Current completion boundary

The high-priority local foundation is implemented and deployed, but the full goal is
not yet safe to mark complete. The strongest missing proof is the real hosted
invitation/acceptance journey with distinct controlled teacher and student accounts.
Content breadth remains intentionally bounded by approved qualification material
rather than being filled with fabricated lessons.

On 31 August 2026 the public release gate, login page and intentional confirmation
page all returned successfully from exact production commit
`574394cf8884d7dc1cb87c2f0fc9cf15c19dc9e7`. The Railway `APP_URL` is the canonical
`https://sccb.up.railway.app` origin. A read-only Supabase Management API inspection
identified that the separate Auth Site URL and redirect allow list still pointed to
the retired `web-production-be53a.up.railway.app` origin, explaining the captured
Railway Not Found link.

The production Auth Site URL was then corrected to `https://sccb.up.railway.app` and
the callback allow list now accepts `https://sccb.up.railway.app/auth/callback**` while
retaining local development callbacks. The repository's read-only Auth configuration
gate passed against production. The invite and recovery templates contain no
hard-coded retired host. A replacement email was sent from the existing controlled
student invitation record at 19:43 local time; the ledger remained at 0 students and
1 awaiting response. The newest recipient link still requires a real click and
acceptance test before hosted onboarding can be called complete.

The next local changes should be driven by observed tutor/learner friction or by an
explicit evidence gap. The repository should not invent attendance, approved
qualification content or operational outcomes merely to make the matrix appear
complete.

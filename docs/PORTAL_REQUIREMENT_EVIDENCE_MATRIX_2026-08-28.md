# Portal requirement evidence matrix

Last verified: 5 September 2026

This matrix tests the current worktree against every numbered section of the
teacher-led portal brief. **Proven locally** means the implementation and a
proportionate local verification exist. **Partial** means the architecture or a
bounded pilot exists but the full product claim would be broader than the evidence.
**External** means the repository cannot prove the deployed operational state.

| Brief requirement | Current status | Authoritative evidence | Remaining proof or work |
| --- | --- | --- | --- |
| 1. Simple teacher workflow | Proven for one controlled hosted learner; tutor-scale use remains partial | Teacher next-action projection; class creation, active unit selection, publishing, invitation ledger and automatic first-student journey activation in `src/app/dashboard/page.tsx`, `src/app/teacher/classes/[id]/page.tsx` and migrations `202608270001` to `202608270003`. Production `/api/release` returned exact commit `baf6095578eb6b1ec78f776464bf7f0adc2ebe7b` on 31 August 2026. A controlled invitation was accepted, the learner was connected to the intended group and the automatic Unit 6 journey opened at its required starting point. A locally verified fallback now lets the teacher open, share and close an expiring class registration link when college email delivery is blocked. The teacher role now has a separate lightweight home with one next action, assigned groups, four totals and a five-item evidence priority list; administrator analytics no longer render or query on a tutor's home. | Deploy and observe the new link flow with one controlled student, then observe the same workflow at tutor/class scale before calling wider rollout complete. |
| 2. Course → Unit → Module → Lesson → Activity | Proven locally for the existing curriculum | Reusable relational hierarchy remains intact; official Pearson topics are presented as modules by `src/app/curriculum/page.tsx`, `src/components/atom-topic-hub.tsx` and `src/lib/learning-catalog.ts`. | Expand only centre-approved content; the portal must not invent missing T Level material. |
| 3. Short, doing-led teaching with no video lessons | Proven locally for the active guided experience | `src/components/topic-explainer.tsx` now provides learner-paced text, examples and a quick check without autoplay or video controls. Short lesson cards lead into adaptive questions and worksheets. Its component test enforces the no-video contract. | Tutor/content-owner review of the wording and qualification accuracy remains necessary before broad publication. |
| 4. Mastery through varied repetition | Proven locally for supported activities | The adaptive submission engine, skill mastery records, retrieval schedules, pathway thresholds and versioned Atom question banks require repeated independent evidence rather than one completion. | Continue coverage unit by unit only where approved questions and mark schemes exist. |
| 5. Starting-point assessment and evidence | Proven locally and in the controlled hosted Unit 6 journey | Existing course and unit starting-point assessment kinds, secure assessment instances, skill results, comparisons, automatic proposed targets and teacher projections are reused. The invited learner saw the exact group before the required Unit 6 starting point and completed 21 mapped questions. The stored teacher view reported 7 of 21, 33.3% and the Support route without treating that baseline as later progress. | Repeat only when another approved unit is piloted; do not infer readiness for units without verified content. |
| 6. Automatic meaningful progress tracking | Proven locally | Immutable attempts/answers, allocation IDs, curriculum module position, lesson/activity continuation, mastery, misconceptions, paper evidence, dates and bounded active time are stored. Opening content alone is not treated as completion. | Production-volume and retention behaviour remain operational checks rather than repository claims. |
| 7. Evidence trail | Proven locally | Learner overview/evidence pages and the report projections join starting points, learning, attempts, misconceptions, feedback, learner response, improvement, targets, interventions and assessment evidence within an exact class/unit scope. Workbook teacher decisions are accepted only through an audited server function that validates the exact active learner, class, unit and approved journey topic; direct browser writes are revoked. | Real tutor review should identify whether any already-stored evidence needs a clearer presentation. |
| 8. Editable teacher-controlled targets | Proven locally | Target creation, approval, editing, review statuses, dates, success measures and audit facts use hardened functions; automatic targets remain proposed until teacher action. | None for the local foundation. |
| 9. Automatic and teacher feedback | Proven locally | Question feedback/explanations, formative-response review, paper review, teacher feedback, return-for-practice state and follow-up comparison are implemented and reportable. | Validate the speed and wording of the teacher review interaction with tutors. |
| 10. Teacher intervention dashboard | Proven locally | Exact-class `class_learner_attention`, teacher next action, the compact `TeacherPriorityList` and the seven-column class curriculum table surface interventions, catch-up, overdue targets/required work, repeated low attempts and declining comparable evidence with drill-through links. The teacher home limits the list to five actionable learners; the complete class evidence remains one click away. Intervention rows are staff-only, require responsibility for the exact class and an active enrolment for the named learner, and cannot be written directly by a browser role. | The portal deliberately does not infer attendance, motivation or inactivity from elapsed time alone. An authorised attendance integration would be needed for attendance-based alerts. |
| 11. Private individual learner profile | Proven locally | Server role checks, RLS, exact-class evidence scoping and the learner overview/evidence pages expose curriculum, progress, strengths/needs, targets, feedback, history and comparisons only to the learner or authorised staff. | Hosted cross-role smoke testing remains desirable. |
| 12. Evidence-led learner, class and unit reports | Proven locally | Private non-cached PDF/CSV routes exist for a learner, whole class and selected unit. Projections use stored facts, preserve missing states and fail closed on query errors or unsafe truncation. Render fixtures cover professional pagination. | Reports organise evidence but do not claim to guarantee Ofsted compliance; real-tutor review remains outstanding. |
| 13. Whole-class curriculum table | Proven locally | `src/lib/class-curriculum-overview.ts` and `src/components/class-curriculum-overview-table.tsx` implement the exact seven columns, active-unit assessment rules, explicit missing states and class-preserving learner links. | None for the local foundation. |
| 14. Simple student experience and exact continuation | Proven locally and through the controlled hosted first action | `StudentEnrolmentSummary`, `selectStudentNextAction`, the primary Continue card, server-backed curriculum position and database activity continuation show the assigned group, prioritise one truthful next action and restore the latest incomplete position. The hosted learner landed in Student mode, saw the correct group and was taken to the Unit 6 starting point. The new controlled join page shows the exact group before registration and uses the same automatic journey/start-point path. `src/lib/display-text.ts` now applies a tested capital-first presentation rule to dynamic unit, topic, lesson, activity and skill labels across the dashboard, curriculum, portfolio and learning pages without rewriting stored curriculum. | Deploy and observe the controlled-link path, then continue observing clarity with real learners; the repository cannot prove usability by automated checks alone. |
| 15. Professional motivation | Proven locally | Progress, mastery, AP levels, badges and private achievements are visible without public learner rankings; language and styling target FE learners. | Usability judgement ultimately needs learner observation. |
| 16. Fresh operational state | Boundary preserved; production now contains only explicitly controlled verification activity in addition to curriculum and genuine timetable groups | Hosted curriculum seed is separated from fictional disposable development/test seeds; runtime empty states use real counts and do not generate learners or outcomes. The two named test groups and earlier test learner were permanently removed with explicit authorisation. One separately invited controlled learner was then accepted and completed a real Unit 6 starting point for the hosted release test. | Do not present the controlled learner as a genuine cohort outcome. Recheck operational records immediately before real learner release. |
| 17. Genuine teacher/student separation | Proven locally and with distinct controlled hosted accounts | `user_profiles.role`, server-side `requireRole`, action-level permission checks, RLS and revoked direct DML enforce the boundary. Role/permission tests and clean-database journeys exercise rejected access, including a student in the same class being unable to read professional intervention rows. Public browser checks confirmed anonymous users receive no admin, teacher-class, learner-progress or dashboard content. A separately invited learner landed in Student mode while the staff account retained its teacher/administrator experience on exact production commit `baf6095578eb6b1ec78f776464bf7f0adc2ebe7b`. | A final hosted check of student-entered teacher URLs remains desirable before wider release, even though the server and database contracts already reject that access. |
| 18. Progressive extension, not rebuild | Proven locally | The implementation retains Next.js App Router, Supabase Auth/RLS, the assessment engine and the reusable curriculum schema; migrations extend rather than replace stored identities or evidence. | Continue as bounded, verified slices; do not bulk-generate unsupported curriculum. |

## Current completion boundary

The high-priority role, invitation, first-action and evidence foundation is implemented
and deployed. The full product goal is not yet safe to mark complete because content
breadth remains intentionally bounded by approved qualification material and the
workflow has not yet been observed at tutor/class scale.

On 31 August 2026 the Auth Site URL and callback allow list were corrected to the
canonical `https://sccb.up.railway.app` origin. A fresh controlled invitation then
completed confirmation, password setup, exact group enrolment, Student mode and the
required Unit 6 starting point. Production was subsequently verified at exact commit
`baf6095578eb6b1ec78f776464bf7f0adc2ebe7b`; the public release gate, anonymous private
route protections, staff pages and learner evidence view all returned their intended
states.

The completed group-page usability slice moves an enrolled group's **Progress at a
glance** table directly below its headline metrics. First-student onboarding remains
visible for an empty group, while repeat invitations and invitation history are
collapsed behind one labelled section once learners exist. The teacher dashboard now
uses its own lightweight query and presentation path, so department analytics no
longer burden the tutor home. This keeps everyday monitoring first without removing
onboarding, evidence or administrator controls.

The current local slice addresses the observed college-email blocker without enabling
open public registration. A teacher can generate one unguessable, seven-day class
link, share it through an approved channel and close it immediately after the class
has registered. It is capped, stores only a hash, preserves one student role per
account, enrols only into the exact published group and starts only the approved
journey. Opening, successful use and closing are auditable. The email workflow
remains available as an optional one-person fallback. The legacy reusable class-code
function and form are disabled, so closing the current registration link does not
leave a second student self-service route open. This slice has passed local
application, build and clean-database verification but is not a hosted production
claim until its commit is deployed and checked there.

The local database now confines class assessment dates to the same active class and
organisation relationships as learner evidence. This secures the scheduling model,
but it does not claim that the supplied assessment-plan screenshots have been entered
as exact dates. The screenshots do not provide an unambiguous machine-readable mapping
for every group, unit and event, so the original workbook or another authoritative
structured source is still required before those dates can be imported without
guessing.

The next local changes should be driven by observed tutor/learner friction or by an
explicit evidence gap. The repository should not invent attendance, approved
qualification content or operational outcomes merely to make the matrix appear
complete.

# Complete-system requirement evidence

This is the completion matrix for the 45-section Hima Learning Hub goal. It
maps requirements to current, inspectable evidence; it is not a substitute for
the automated checks.

| Goal section | Implemented evidence |
|---|---|
| 1–3. Existing app, purpose and roles | Next.js application preserves the existing visual shell and Supabase architecture. `student`, `teacher`, and `administrator` roles are enforced in server actions, route handlers, and RLS. Formal assignments remain explicitly outside scope. |
| 4–6. Course catalogue | `seed_complete_system.sql` publishes the complete BTEC catalogue and T Level core/content-area plus Digital Software Development structure. The foundation journey asserts both catalogues. |
| 7. Curriculum versions | `curriculum_versions`, archive-safe administration, immutable assessment evidence, governance audit log, and administrator UI. |
| 8–10. Classes and curriculum selection | Flexible class creation, Groups 1–5 seed, different course per class, academic period, dates, additional teachers, enrolment code, CSV import, transfer/archive lifecycle, multi-unit and active-unit selection. |
| 11–12. Curriculum hierarchy and topic structures | Course → version → unit/content area → learning aim/performance area → topic → skill → lesson → activity → question schema; BTEC initial unit structures and complete Unit 4 pilot seed. |
| 13. Starting points | Separate approved eight-skill BTEC and T Level course starting points; Unit 4 starting point; one-attempt immutable instances and permanent learner context. Student dashboard resolves the starting point from the enrolled course. |
| 14–16. Progress points and calculation | Blueprint-matched progress/retention checks, permanent starting evidence, per-skill comparisons, improvement status and topic/skill recalculation. |
| 17–20. Adaptive pathways and safeguards | Per-skill Support/Core/Stretch/Mastery, configurable thresholds, Full Path/Reduced Practice/Mastery Check Only/Fast-Tracked routes, teacher override, route evidence, accessible skipped content, delayed retention scheduling, and no whole-unit skip rule. |
| 21. Lesson structure | Python pilot includes Learn, worked examples, guided/core/challenge practice, mastery and retrieval stages. |
| 22–23. Weekly learning and homework | Weekly plan model, 1–5 homework sessions, adaptive skill/difficulty allocation, release/deadline, required/optional status and learner overdue display. |
| 24–25. Question bank and variation | Curriculum/skill/pathway/difficulty/type mappings, controlled draft/approval flow, detailed teacher editing, blueprint and misconception mapping, deterministic templates and stored parameter variants. |
| 26. Automatic marking | Server-side deterministic marking for supported response types; extended/reflection responses enter teacher review and recalculate evidence after review. |
| 27. Misconceptions | Question mappings, occurrence history, resolved state, skill impact, learner/class visibility and reporting. |
| 28. Result storage | Append-only attempts and answers store marks, pathway, timings, hints, feedback, skill evidence and assessment context; cross-device persistence comes from hosted PostgreSQL. |
| 29. Targets | Weekly/topic/unit/term-semester target model with measurable text, evidence, dates, review, approval, notes, outcome and full status lifecycle; edit/review and bulk approval UI. |
| 30. Academic calendar and snapshots | Academic years, terms/semesters, teacher calendar management for all five event kinds, learner important-date display, and append-only period snapshots with next priorities. |
| 31. Evidence chain | Learner page combines starting/progress comparisons, routes, attempts, targets, teacher actions, interventions, misconceptions, retention and snapshots into dated evidence. |
| 32. Teacher action log | All named actions plus custom action, teacher/date/reason/review/outcome, individual and 1–100 learner bulk actions, with audit evidence. |
| 33. Teacher dashboard | All requested filters operate on class/curriculum/mastery/activity/date/completion evidence. Group/course/unit cards, completion/progress/action signals, misconceptions, pathway readiness and drill-down to class → learner → attempts are present. |
| 34. Individual learner page | Profile/class/course evidence, skill comparisons and pathways, attempt history, work status, misconceptions, routes, targets, teacher actions, interventions, rewards and snapshots. |
| 35. Reports | Authorised learner and class PDF/CSV exports with factual starting, progress, activity, pathway, misconception, target, action, intervention, retention and next-step evidence. |
| 36. Inspection-supporting evidence | Normal learner/teacher actions naturally create the requested evidence. UI and reports avoid “Ofsted approved” and unsupported quality judgements. |
| 37–40. Badges, coins, rewards and streaks | Configurable badge definitions/evaluator, idempotent awards, configurable server-issued coin rules, transaction history/corrections, cosmetic-only purchases and planned-learning-day streaks that teachers can disable. |
| 41. Access and privacy | Organisation/class/learner RLS, server role checks, correct-answer secrecy, append-only attempts, archive/retention and authorised deletion workflows. Security journey asserts cross-learner and unauthorised-class isolation. |
| 42–43. First slice and Python pilot | All 25 slice items are represented. Unit 4 pilot contains five teaching screens, three worked examples, 34 interactions, all practice stages, mastery/retrieval/progress checks, adaptive homework, targets and rewards. |
| 44. Testing | `scripts/verify-database-contract.ps1` runs 22 journeys independently from clean databases. Vitest has 10 passing tests. TypeScript, ESLint and production build are clean. |
| 45. Completion standard | Setup is in `README.md`; architecture/plans/audits are in `docs/`; hosted migrations are aligned through `202607280020`. |

## Verification commands

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-database-contract.ps1
npm run typecheck
npm run lint
npm test -- --run
npm run build
npx supabase migration list --linked
```

The SQL verifier deliberately uses one new database per journey so no test can
pass because another test prepared hidden state.

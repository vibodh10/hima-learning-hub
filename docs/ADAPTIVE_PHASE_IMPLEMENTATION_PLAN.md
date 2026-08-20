# Adaptive learning phase: implementation plan

## What already works and will be preserved

- Student and teacher Supabase Auth accounts.
- Role-aware dashboards and class membership.
- The five-question legacy activity.
- Atomic server-side marking and immutable evidence.
- Topic progress, proposed targets, teacher learner views, and PDF/CSV reports.
- Current responsive visual system, page shell, and component naming.

## Migration sequence

### Migration 002: curriculum and adaptive engine

- Correct the Pearson BTEC pathway and five unit labels.
- Add a placeholder T Level course without publishing unfinished content.
- Add learning aims, skills, learning stages, teaching screens, worked examples,
  question approval metadata, question templates, misconceptions, allocations,
  weekly plans, skill mastery, retrieval schedules, and detailed attempt fields.
- Add badge, coin, reward, purchase, gamification-setting, and healthy-streak
  tables.
- Add indexes, RLS, column grants, audit-safe teacher write policies, and
  security-definer mutations.

### Pilot data

- Add Unit 4 Python topic “Variables, data types, input, processing and output”.
- Add five teaching screens and three worked examples.
- Add guided, core, challenge, mastery, and retrieval activities.
- Add at least 30 approved questions/interactions across the required question
  types and controlled deterministic variations.
- Add unpublished placeholders for the future Unit 2, 4, 6, 8, and 9 topics.

## Application work

- Replace the fixed lesson implementation with a dynamic
  `/learn/[lessonId]` route while retaining `/learn/network-security`.
- Extend `PracticeForm` for hints, immediate guided feedback, code and ordering
  question types, and per-question timing/evidence.
- Add a staged lesson navigator: Learn, Worked examples, Guided, Core,
  Challenge, Mastery, and Retrieval.
- Add teacher curriculum, lesson, question, approval, allocation, and preview
  screens using existing role guards and Server Actions.
- Add compact student dashboard cards for weekly work, mastery, badges, coins,
  weak skills, and retrieval.
- Add teacher class analytics for completion, heat map, mastery distribution,
  misconceptions, support/inactivity, gamification overview, and first-versus-
  latest scores.

## Adaptive rules

The initial recommendation uses score bands but is modified by first-attempt
accuracy, hints, repeated misconceptions, improvement, completion time,
retrieval evidence, and confidence:

- effective mastery below 50: Support;
- 50–69: Core;
- 70–84: Stretch;
- 85 or above: Mastery.

Hint use and repeated errors reduce effective mastery. Improvement and successful
retrieval allow upward movement. No learner is permanently locked into Support.

## Badge, coin, and reward controls

- Badge criteria are stored as JSON rules and evaluated only on the server.
- Coin awards use unique idempotency keys and capped repeat rules.
- Purchases are transactional and cosmetic only.
- Teacher corrections create compensating ledger entries and audit records.
- Hints, marks, required work, answers, mastery, and teacher evidence are never
  purchasable.
- Gamification can be disabled by organisation, class, or learner.

## Risks and controls

| Risk | Control |
|---|---|
| Exposing correct answers | Keep answer columns revoked; mark in RPCs only |
| RLS recursion or cross-learner leakage | Security-definer predicates plus negative DB tests |
| Coin farming | Idempotency keys, award caps, and append-only ledger |
| Incorrect generated questions | Deterministic parameters or draft/approval workflow |
| Breaking historical evidence | Additive migration and archival rather than deletion |
| Dashboard overload | Compact summaries with drill-down routes |
| Formal-assignment scope creep | Activity-kind checks and explicit product copy/tests |
| Weak mastery decisions | Store component evidence and use more than score alone |

## Verification matrix

- Migration applies cleanly to an empty/local database and the connected hosted
  project.
- Existing teacher and student logins and legacy activity still work.
- Curriculum hierarchy and every approved pilot question have a skill.
- Pilot exposes at least 25 meaningful interactions.
- Every attempt and answer remains immutable and is readable after a new session.
- Skill mastery moves down and up correctly and schedules additional practice.
- Retrieval uses different approved questions for the same skills.
- Badges are awarded once with evidence.
- Coin awards are server-only, idempotent, capped, and fully ledgered.
- Cosmetic purchase is transactional and cannot affect academic evidence.
- Cross-learner and non-owning-teacher access is denied.
- Teacher content changes require an authorised role and drafts are hidden from
  students.
- Vitest, database security tests, TypeScript, ESLint, production build, and full
  student/teacher browser journeys pass.


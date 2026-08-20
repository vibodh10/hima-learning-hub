# Adaptive learning phase: architecture audit

Audit date: 27 July 2026.

## Existing architecture to preserve

- Next.js 16 App Router with React Server Components for data-led pages and small
  Client Components for interactive forms.
- Supabase Auth using the existing `user_profiles.id = auth.users.id` identity
  relationship.
- Supabase PostgreSQL as the source of truth, with RLS as the final access
  boundary and role checks in Server Actions and Route Handlers.
- Existing role names: `student`, `teacher`, `administrator`.
- Existing pathway names: `Support`, `Core`, `Stretch`, `Mastery`.
- Existing class workflow: `classes`, `enrolments`, `create_class`, and
  `join_class`.
- Existing evidence workflow: immutable `attempts` and `attempt_answers`,
  `submit_activity`, `topic_progress`, and suggested `targets`.
- Existing page structure: `/dashboard`, `/learn/network-security`,
  `/teacher/classes/[id]`, `/teacher/learners/[id]`, and the private report route.
- Existing component names: `AppHeader`, `AuthForm`, `CreateClassForm`,
  `JoinClassForm`, and `PracticeForm`.

## Authentication and authorisation

`src/lib/auth.ts` resolves the authenticated user with
`supabase.auth.getUser()` and then reads the matching `user_profiles` record.
`requireRole()` is the page-level role guard. `src/lib/permissions.ts` contains
the application-level permission matrix.

Database helper functions `current_profile`, `is_admin`, `can_access_class`, and
`can_access_learner` provide RLS predicates. Teachers can access only learners
enrolled in their own active classes. Students can access only their own learner
evidence.

This phase must extend those helpers rather than introduce a second identity or
permission system.

## Current curriculum and activity model

The existing hierarchy is:

`courses -> units -> topics -> lessons -> activities -> activity_questions -> questions`

Missing from the required hierarchy are learning aims, skills, explicit learning
stages, reusable teaching screens, and reusable worked examples. Questions are
mapped to course/unit/topic but not to a skill.

The existing question enum already supports several useful types, including
single choice, multiple response, true/false, matching, ordering, fill blank,
short text, numeric, code output, pseudocode ordering, code completion,
scenario, confidence, and reflection.

The question record currently lacks approval state, pathway distinct from
difficulty, correct/incorrect feedback, hint, learning aim, skill, variation
template, and authoring provenance. Correct answers are deliberately not granted
to browser roles; marking occurs in the `submit_activity` security-definer RPC.

## Existing five-question activity

`/learn/network-security` loads the fixed activity
`70000000-0000-0000-0000-000000000001`. `PracticeForm` renders five question
types and posts all answers to `submitPractice`, which calls `submit_activity`.
The RPC creates a new immutable attempt, marks each answer, returns feedback,
updates topic progress, and creates a proposed target.

This mechanism is sound but fixed to one page and topic. It will become a dynamic
lesson/activity engine while the legacy route remains available.

## Existing progress storage

- `attempts`: immutable activity attempt header, attempt number, timing, marks,
  percentage, hints, pathway, and optional teacher override.
- `attempt_answers`: immutable per-question answer and mark evidence.
- `topic_progress`: first/latest/best/average scores, attempt count, completion,
  and pathway.
- `targets`: proposed/approved target workflow with evidence.
- `achievements`: one award per learner and code, but without configurable badge
  definitions or detailed evidence.
- `interventions`, `teacher_notes`, `deadlines`, and `reminders` already provide
  useful extension points.

Skill-level mastery, misconceptions, retrieval scheduling, coins, rewards,
healthy streaks, and configurable badge criteria do not yet exist.

## Current dashboards

The student dashboard shows class readiness, pathway, latest topic score, active
targets, and one continue-learning card. The teacher dashboard shows class and
learner counts and class links. Class and learner detail pages show the roster,
topic progress, targets, and dated attempt evidence.

The visual structure is satisfactory and will be preserved. New data will be
added in compact sections rather than replacing the dashboards.

## Naming and compatibility decisions

- Keep all current table, enum, function, route, and component names.
- Add new tables and columns through a second idempotent migration.
- Preserve the legacy network-security activity and its historical attempts.
- Correct the seeded course and unit labels in place; do not rewrite historical
  foreign keys.
- Use `skill_mastery` for per-skill state while retaining `topic_progress`.
- Use `badge_definitions` plus `badge_awards`; keep `achievements` as a compatible
  summary of awards.
- Use an append-only `coin_transactions` ledger. A balance is derived through a
  protected view/function, never trusted from the client.
- Treat every activity as formative learning/practice. No assignment concepts,
  grading, submission, resubmission, or plagiarism features will be added.


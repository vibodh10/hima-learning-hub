# Hima Learning Hub

Hima's build explanation and the invitation-only student onboarding procedure are in [docs/HIMA_WEBSITE_AND_STUDENT_ONBOARDING.md](docs/HIMA_WEBSITE_AND_STUDENT_ONBOARDING.md).

A responsive learning-practice and progress application for Level 3 Computing and
Digital learners. Formal BTEC and T Level assignments are explicitly out of scope.

## Implemented system

The original vertical slice is preserved and extended with:

- teacher registration and shared student/teacher login through Supabase Auth;
- organisation, role, class and learner-aware PostgreSQL RLS;
- complete catalogues for **Pearson BTEC Level 3 National Information
  Technology** and **T Level Digital Software Development**, with versioned
  curriculum records, content areas, occupational-specialism performance areas,
  per-class multi-unit selection, and a course-specific starting point for each;
- one complete Unit 4 Python topic with five teaching screens, three worked
  examples and 34 approved skill-mapped interactions;
- guided, core, challenge, mastery and later retrieval stages;
- deterministic question templates and a teacher-controlled question bank;
- immutable attempt/evidence tables, topic progress and measurable target rules;
- adaptive per-skill mastery, misconception evidence and retrieval scheduling;
- configurable badges, server-controlled coins, healthy practice streaks and a
  cosmetic-only rewards shop;
- teacher lesson/question editing, content approval, class allocation,
  assessment/activity authoring, academic-calendar management, gamification
  settings, target review and audited coin corrections;
- adaptive homework, weekly plans, four-level measurable targets, permanent
  term/semester snapshots, teacher action logs and bulk actions;
- learner and class PDF/CSV evidence reports;
- expanded role-aware student, class and learner dashboards;
- responsive, accessible PWA shell and basic privacy page;
- tested deterministic marking, reward idempotency and cross-learner isolation.

The legacy five-question network-security route remains available. Formal
assignment collection, marking, feedback, resubmission and qualification grading
remain explicitly outside the product.

## Local setup

Prerequisites: Node.js 20+, npm, Supabase CLI, and a Supabase project.

1. Copy `.env.example` to `.env.local` and add the project URL and publishable key.
2. Link the Supabase CLI: `npx supabase link --project-ref YOUR_PROJECT_REF`.
3. Apply every migration in `supabase/migrations` with
   `npx supabase db push --linked --include-all`.
4. Reset a disposable local stack with `npx supabase db reset`. Apply
   `supabase/seed.sql`, `supabase/seed_adaptive_python_pilot.sql`, and
   `supabase/seed_complete_system.sql` if they are not configured as local seed
   files.
5. Install and run: `npm install` then `npm run dev`.

## Quick hosted-data demo

Double-click `START_HIMA.cmd`, keep its terminal window open, and visit
`http://localhost:3000`. If the terminal is closed, the local website stops.

The home page has separate **Student sign in** and **Teacher sign in** buttons.
Each opens a pre-filled fictional test account; press **Sign in** to enter:

- student: `student.hima.ms38skyz@example.com`
- teacher: `teacher.hima.ms38skyz@example.com`
- password for both: `password`

These weak credentials exist only to make the connected test model easy to
evaluate. Change or delete the accounts before publishing the application.

Local-only fictional accounts:

- `teacher@northbridge.example` / `LocalTeacher!26`
- `learner@northbridge.example` / `LocalLearner!26`
- class enrolment code: `HIMA-2026`

These credentials are intentionally documented for local development and must
never be deployed to a shared or production Supabase project.

For a hosted test project, use `supabase/seed_hosted_curriculum.sql` for the
fictional organisation base and then
`supabase/seed_adaptive_python_pilot.sql`. Neither adaptive seed creates Auth
accounts, passwords, enrolments, attempts or personal data.

Run database security assertions after the local stack is available:

`npx supabase test db`

PostgreSQL-only verification is automated by:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-database-contract.ps1
```

The verifier creates a new disposable database for each SQL journey, applies
the full migration and seed chain, and currently runs 23 independent journeys.
Coverage includes enrolment and class lifecycles, RLS isolation, immutable
starting points, equivalent progress checks, adaptive routing and homework,
targets, snapshots, question/activity authoring, teacher and bulk actions,
calendar management, badges, configurable server-side coins, reporting data,
governance, retention and authorised deletion.

Teacher registration records `requested_role=teacher` in auth metadata but does
not grant the role. An authorised administrator must create/approve the matching
profile. This prevents public self-escalation.

## Verification

```text
npm test
npm run typecheck
npm run lint
npm run build
```

The release gate covers unit tests, 23 independent database journeys,
TypeScript, ESLint and a Next.js production build.

## Safe Test Mode

Sign in as a teacher or administrator, open any approved lesson and then open
an activity. The activity page shows the banner **TEST MODE — results are not
part of a real learner record.** Use it to reveal expected answers, simulate
scores and pathways, preview achievement feedback and confetti, simulate
targets/coins/reward ownership, move to the next activity, or reset the
fictional sandbox learner.

Test Mode writes only to `test_mode_sessions` and `test_mode_events`. It does
not create attempts, mastery, targets, interventions, streaks, badges, coin
transactions, purchases, homework completion, or inspection evidence. Students
never see Test Mode and server-side submission rejects locked activities.

For a manual journey check:

Follow the full 20-step role journey in
`docs/SAFE_TESTING_AND_LEARNING_JOURNEY.md`.

## Security notes

- The service-role key is server-only and must never use a `NEXT_PUBLIC_` prefix.
- RLS is enabled on learner, class, curriculum and evidence tables.
- Correct-answer columns are revoked from browser roles.
- The service worker caches public shell pages only; authenticated learning,
  evidence and report routes remain network-only.
- Route handlers and server actions must perform their own identity and role check
  in addition to RLS.
- Attempts are append-only evidence. Teacher corrections are explicit overrides.
- The included privacy page is a product baseline, not a college-complete privacy
  notice or DPIA.

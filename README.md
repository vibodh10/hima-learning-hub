# SCCB Digital Learning Hub

The build explanation and invitation-only student onboarding procedure are in [docs/HIMA_WEBSITE_AND_STUDENT_ONBOARDING.md](docs/HIMA_WEBSITE_AND_STUDENT_ONBOARDING.md).

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
- explicitly class-scoped learner, whole-class and class-unit PDF/CSV evidence reports,
  including inclusive date-window exports for an individual learner that omit
  undated current aggregates rather than presenting them as historical facts;
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
   files. The first and third files contain fictional local verification
   identities/groups and must never be applied to a hosted or production project.
5. Install and run: `npm install` then `npm run dev`.

## Local role testing

Run `npm run dev` and visit `http://localhost:3000`.

The sign-in form is deliberately role-neutral. Use a distinct teacher account
and invited student account: one account has one database-backed role and cannot
switch roles from a login link or URL. Student accounts should be created through
the invitation flow on an authorised class page. No pre-filled demo credentials
or fake student records are included in the application UI.

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
the full migration and seed chain, and currently runs 42 independent journeys.
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

The release gate covers unit tests, 43 independent database journeys,
TypeScript, ESLint and a Next.js production build.

After deploying a committed revision, run the read-only public verification in
`docs/HOSTED_PORTAL_VERIFICATION.md`. It checks the safe `/api/release` identity,
public pages and anonymous route isolation without creating accounts or evidence.
The separate controlled-account checklist remains mandatory for invitation delivery,
acceptance and authenticated cross-role proof.

## Staff activity preview

Sign in as a teacher or administrator, open any approved lesson and then open
an activity. The activity page labels the controls **Staff preview** and explains
that they do not create a student account or learner result. Use them to reveal expected answers, simulate
scores and pathways, preview achievement feedback and confetti, simulate
targets/coins/reward ownership, move to the next activity, or clear the
isolated preview.

Staff preview writes only to `test_mode_sessions` and `test_mode_events`. It does
not create attempts, mastery, targets, interventions, streaks, badges, coin
transactions, purchases, homework completion, or inspection evidence. Students
never see staff-preview controls and server-side submission rejects locked activities.

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

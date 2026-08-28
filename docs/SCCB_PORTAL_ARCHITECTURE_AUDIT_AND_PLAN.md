# SCCB Computing Learning Portal architecture audit and implementation plan

Audit date: 24 August 2026

## Decision

Evolve the existing application through additive, reversible slices. Do not
replace the application, its authentication system, its evidence history, or
working learner routes.

The immediate release blocker is the invitation journey. The next structural
blocker is that the portal currently has two overlapping learning engines and
does not yet have one authoritative, holiday-aware group teaching journey.

## Current deployed architecture

- Railway serves the `web` service from repository `vibodh10/hima-learning-hub`.
  Production is running commit `908df5f` from `main` at
  `https://web-production-be53a.up.railway.app`.
- Next.js 16.3.1 App Router, React 19, TypeScript, Server Components, Server
  Actions and Route Handlers provide the web application.
- Supabase Auth provides email/password authentication, password recovery and
  invitation email delivery.
- Supabase PostgreSQL stores organisations, profiles, classes, enrolments,
  curriculum, attempts, evidence, progress, targets, interventions, rewards,
  audit records and reports.
- PostgreSQL row-level security is the final data-access boundary. Server
  actions and private routes also apply identity and role checks.
- Railway has the expected public application URL, Supabase URL, publishable
  key and service-role variable configured. Values were not exposed during the
  audit.

## Current route and role shape

### Public and account routes

- `/`, `/login`, `/register`, `/forgot-password`, `/auth/confirm`,
  `/auth/callback`, `/update-password` and `/privacy`.
- Student self-registration is not offered by the UI, but Supabase's public
  signup capability is currently enabled and must be reviewed as part of the
  invitation/security release gate.

### Student experience

- `/dashboard` shows pathway, latest score, coins, streak, active units,
  allocated work, calendar events, the Python pilot sequence, mastery,
  achievements, retrieval, starting/progress comparisons and routes.
- `/curriculum/**` provides a second static curriculum/workbook experience for
  Units 1, 2, 4, 6, 8 and 9.
- `/learn/[lessonId]/**` provides the database-driven lesson/activity engine.
- `/progress` and `/rewards` provide cross-unit progress and cosmetic rewards.

### Teacher experience

- `/dashboard` provides aggregate signals, filters and class links.
- `/teacher/classes/[id]` combines monitoring with invitation, class setup,
  class dates, curriculum selection, weekly plans, thresholds, reward rules,
  homework allocation, bulk actions and lifecycle administration.
- `/teacher/learners/[id]` exposes detailed learner evidence and professional
  judgement controls.
- `/teacher/content` exposes curriculum and activity authoring to teachers as
  well as administrators.
- `/api/reports/classes/[id]` and `/api/reports/learners/[id]` generate private
  PDF/CSV reports.

### Administrator experience

- `/admin` manages users, curriculum versions, academic years, retention,
  badges and governance records.

## Database assessment

The schema already contains useful foundations that must be preserved:

- organisations, role-bearing profiles, academic years, classes, class
  teachers, enrolments and reusable class-to-unit links;
- curriculum versions, units, topics, lessons, teaching screens, worked
  examples, activities, questions, skills and misconceptions;
- immutable attempts and answers, assessment instances, skill results,
  starting/progress comparisons, topic progress and learner routes;
- targets, reminders, interventions, teacher actions and period snapshots;
- badges, coin transactions, streaks, configurable reward rules and audit logs;
- learner curriculum attempts and workbook evidence for the newer static
  curriculum experience.

Important gaps:

- no authoritative group-unit/topic journey activation record;
- no teaching-week clock derived from journey activation and non-teaching
  calendar periods;
- no first-class worksheet definition, response/version and artefact model;
- no missed-lesson/catch-up state machine with reminder and intervention
  escalation;
- no professional Achievement Point level/threshold model matching the new
  brief;
- no recognition-template, certificate-eligibility or attendance-integration
  model;
- no single portfolio projection that joins every evidence type and preserves
  uploaded artefact versions.

## Invitation audit

Current flow:

1. A teacher or administrator opens a class and submits a name and email.
2. The server checks class ownership and organisation.
3. Supabase Admin sends an invite with an auth callback URL.
4. The application records the Auth user against the durable invitation but defers
   the student profile and class enrolment until secure acceptance.
5. The email template is expected to open `/auth/confirm` with a token hash.
6. The learner presses **Continue securely**, the server verifies the OTP,
   establishes the session and redirects to password setup.

Verified during this audit:

- Railway is serving the current repository commit.
- `APP_URL` matches the live HTTPS origin.
- the required Supabase variables are configured;
- email authentication is enabled and email confirmation is required;
- the live confirmation page renders;
- a deliberately invalid token is rejected and redirected to the expired-link
  state;
- recent Railway traffic contains successful GET requests to
  `/auth/confirm`, but there was no successful confirmation submission visible
  before the controlled invalid-token diagnostic.

Unverified and unsafe to claim as working:

- current SMTP delivery to a controlled inbox;
- the exact current Supabase invite template and allowed-redirect list;
- a fresh token completing acceptance on the live deployment;
- connection of an invitation to an email that already owns an account;
- final class association after a real acceptance;
- invalid and expired real-token journeys.

Implementation weaknesses:

- there is no durable invitation record or visible state history;
- existing accounts receive only a generic failure instead of an idempotent
  class-connection path;
- Auth, profile and enrolment changes are not one recoverable workflow;
- errors are deliberately generic but are also not categorised for staff;
- there are no invitation-focused unit, integration or live smoke tests;
- `.env.example` omits the required public application URL;
- public API signup remains enabled even though the product is intended to be
  invitation-only.

## Learning-journey audit

The curriculum belongs to reusable unit/topic records and classes link to
units, which is the correct starting direction. However, class configuration
still requires start/end dates and weekly-plan/activity allocation forms.

Academic calendar events can represent holidays and teaching weeks, but they
are currently informational. They do not pause or resume a journey clock.
Activity progression is based on prerequisite completion and explicit
retrieval dates, not a 12-teaching-week group journey.

Units 2, 4 and 6 have extensive static topic maps, practice questions and
project scaffolds. Only the database-driven Unit 4 Python pilot is close to a
complete persisted lesson sequence. The static and database-driven systems
must be joined rather than expanded independently. Pearson criteria and formal
assignments must remain configurable and must not be treated as approved until
the centre supplies/confirms the authoritative specification materials.

## Dashboard and administration audit

The student dashboard contains useful evidence but does not yet lead with the
requested **My Computing Journey** summary or one authoritative next action.
It mixes the Python pilot, static curriculum and allocated work.

The teacher dashboard provides useful aggregate counts but does not provide a
single learner-status table answering **Who needs me?**. The class page places
many routine configuration forms before learner monitoring. Content creation
and allocation are normal teacher workflows rather than administrator-only
curriculum governance.

## Evidence, achievement and reporting audit

Immutable objective attempts, question responses, assessment comparisons,
teacher-reviewed practical attempts, targets and snapshots provide a strong
evidence base. PDF/CSV learner and class exports already exist and avoid
fabricating missing evidence.

The current evidence model does not yet provide a general versioned artefact
store or one side-by-side before/after view. The current coin/reward-shop model
does not match the requested professional Computing Achievement AP levels.
Attendance, recognition templates, certificate eligibility and an Ofsted-style
evidence view are not implemented.

## Verification baseline

- Git worktree: clean at audit start.
- TypeScript: passed.
- ESLint: passed.
- Next.js production compilation: passed through compilation and TypeScript.
- Vitest: 78 passed, 4 failed, 1 skipped. All four failures are in
  `adaptive-learner-journeys.test.ts` because old dated evidence is interpreted
  as retrieval-due when tests use the real current date. The earlier readiness
  document claiming a fully passing suite is therefore stale.

## Safest incremental implementation plan

### Phase 0 — Stabilise the baseline

1. Make time-sensitive domain tests deterministic.
2. Add an explicit application-origin helper and production configuration
   assertions.
3. Add invitation-focused test seams without changing learner data.
4. Re-run unit, type, lint and build gates.

### Phase 1 — Invitation release blocker

1. Add a durable, auditable invitation lifecycle without storing raw tokens.
2. Make invitation creation idempotent and support securely connecting an
   existing student account to the correct organisation/class.
3. Separate email delivery, profile provisioning and enrolment finalisation so
   failures are recoverable and visible to authorised staff.
4. Accept and validate the supported Supabase token/callback shapes with safe
   redirects and clear expired/invalid states.
5. Add tests for URL generation, new users, existing users, invalid/expired
   tokens, rollback/retry and class association.
6. Verify the live journey with a user-approved controlled inbox. Do not call
   the issue fixed until that test passes.

### Phase 2 — One authoritative group journey

1. Add reusable unit/topic journey definitions and group journey activations.
2. Start a journey with one teacher action and no manually entered dates.
3. Derive teaching week 1–12 from activation plus the administrator calendar.
4. Pause on holidays/closures and resume without teacher action.
5. Project current/next content to students without duplicating curriculum per
   group.

### Phase 3 — Pre-built lesson, worksheet and catch-up slice

1. Promote curriculum authoring to administrator governance.
2. Add lesson/worksheet sections, short-video metadata and versioned responses.
3. Add missed-learning detection, catch-up tasks, reminder/escalation states
   and teacher attention signals.
4. Pilot one complete topic before expanding Units 2, 4 and 6.

### Phase 4 — Student and teacher priority modes

1. Replace the mixed student landing view with **My Computing Journey** and one
   next action.
2. Add the teacher **Who needs me?** table with accessible named statuses:
   On Track, Catch-up Required, Action Required, Intervention Required and
   Exceeding.
3. Move routine content/allocation forms out of normal teacher mode.

### Phase 5 — Evidence and adaptation

1. Add the versioned portfolio/artefact model.
2. Preserve and compare before, progress-check and after work.
3. Derive routine adaptation and next practice from evidence while retaining
   explicit teacher overrides for professional judgement.

### Phase 6 — Computing Achievement

1. Introduce configurable AP rules, Bronze/Silver/Gold/Diamond thresholds and
   professional badges.
2. Add predefined recognition templates and certificate-eligibility review.
3. Keep private learner progress and remove public ranking incentives.

### Phase 7 — Reporting and integrations

1. Extend existing reports and add the evidence view using only stored facts.
2. Add attendance as an authorised integration boundary, never a manual
   teacher register.
3. Verify report language, PDF layout, role isolation and missing-data states.

### Phase 8 — Full release verification

Run unit/component tests, isolated database journeys, role/RLS tests,
invitation tests, responsive browser journeys, PDF visual checks, regression
tests and a controlled production smoke test after each deployable slice.

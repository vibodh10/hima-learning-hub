# Phase 1 portal audit and implementation record

Date: 26 August 2026

## What was confusing or broken

- A late database migration made group creation and unit selection administrator-only. A normal tutor could monitor an assigned group but could not complete the intended first-use journey.
- The teacher dashboard exposed useful evidence but did not explain the sequence: programme, units, group, invitation, starting point, progress.
- The student curriculum screen rendered the complete static BTEC catalogue rather than deriving its cards from the student's active enrolment.
- Static curriculum URLs could be opened directly unless the route performed its own assigned-unit check.
- Group creation asked tutors to invent and manage an enrolment code even though secure email invitation is the approved onboarding method.
- The T Level catalogue exists as editable database data, but approved teaching material has not been supplied for it. The portal must not pretend otherwise.

## Existing work preserved

- Supabase Auth identity and the `user_profiles.role` role source.
- Server-only teacher, student and administrator route guards.
- Row-level security for class, learner, attempt, answer, progress and evidence ownership.
- BTEC and T Level programme records and editable unit catalogue.
- Secure student invitation lifecycle and automatic class enrolment.
- Starting-point, adaptive route, learning journey, immutable attempts/answers, worksheets, feedback reviews, versioned portfolio evidence, catch-up state and reports.
- Existing BTEC Unit 4 Python explanations, examples, questions and practice structures; no unapproved T Level content was invented.

## Phase 1 changes

- Restored teacher-owned group creation and teacher-managed unit selection for groups they own or co-teach.
- Kept organisation, class ownership and unit validity checks inside security-definer database functions.
- Replaced tutor-entered enrolment codes with a generated internal value and redirected new tutors straight to unit selection.
- Put unit selection before student invitation and block invitation until at least one unit is published.
- Allowed co-teachers recognised by row-level security to use the invitation workflow.
- Added a plain-language four-step teacher introduction and genuine zero-data states.
- Changed role-specific navigation so teacher and student destinations are never mixed.
- Added a role-aware **How the portal works** guide so tutors and students can understand their complete workflow inside the application.
- Added finished loading, recoverable error, not-found and zero catch-up states instead of framework defaults or blank sections.
- Derived the student **My units** and **My progress** screens from active, published group assignments.
- Added server-side checks to every static unit, topic, starting-point, practice-paper, project and practice route.
- Added the same assigned-unit checks to progress, starting-point, worksheet and attempt mutations.
- Added database policies preventing direct browser inserts or updates for an unassigned unit.
- Added an administrator-only tutor onboarding form for the six requested names. It accepts only a verified email, creates an authenticated teacher profile, sends a first-password setup link and safely resends setup for an existing active teacher without changing roles.
- Promoted the existing Hima portal-owner profile to administrator with explicit approval, enabling the staff-onboarding controls while retaining the teaching overview available to administrators.
- Replaced the ambiguous single onboarding form with a six-tutor status roster showing **Access active** or **Login needed**, plus the known login email, before the secure create/resend action.

## Role separation

- Teacher pages call `requireRole("teacher", "administrator")`.
- Student-only progress and portfolio pages call `requireRole("student")`.
- Administrator pages call `requireRole("administrator")`.
- Static learning routes now require an assigned published unit for students.
- Database-driven lessons remain protected by curriculum RLS.
- Learner records remain scoped through `can_access_learner`, which resolves only the learner, an administrator, or a teacher responsible for one of the learner's active groups.

## Production database migrations

- `202608260001_tutor_owned_group_setup.sql`
- `202608260002_student_assigned_unit_enforcement.sql`

Both migrations were applied successfully to the linked production Supabase project.

## Verification

- TypeScript: passed.
- ESLint: passed.
- Vitest: 128 passed, 1 intentionally skipped.
- Next.js production build: passed; 89 pages generated, including the role-aware help page.
- Focused permissions, role-navigation and invitation workflow tests: 20 passed.
- Live invitation confirmation page: opened successfully with the correct SCCB branding and secure single-use confirmation step.
- Production teacher-account audit: none of the six requested tutor names currently exists, so no duplicate accounts were created.

## Information still required

Secure first-login setup requires the verified email address for each tutor:

- Robert Thacker
- Lee Thomas
- Ruhail Rana
- Joan Jones
- Julie Harris
- Kevin Marriott

Phase 2/T Level completion later requires the confirmed official qualification/specification links, final unit selection, approved resources and tutor-confirmed teaching dates. College holidays and closures must be supplied rather than guessed.

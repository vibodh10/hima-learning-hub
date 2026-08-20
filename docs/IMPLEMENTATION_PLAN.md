# Hima Learning Hub implementation plan

## Repository inspection

The repository was empty on 27 July 2026: no application code, package manifest,
database, tests, or Git history existed. A fresh Next.js 16 App Router project was
therefore created. There was no working architecture to replace.

## Architecture

- Next.js App Router and React Server Components for the web application.
- TypeScript and Zod at trust boundaries.
- Supabase Auth plus PostgreSQL. Browser requests use the publishable key; privileged
  operations must remain server-side.
- PostgreSQL row-level security (RLS) is the final data-access boundary. Server
  actions and route handlers also check identity and role.
- Reusable pure domain functions perform deterministic marking, progress, pathway,
  and target calculations.
- Immutable attempts and attempt answers provide the evidence history.
- Route handlers produce factual CSV/PDF learner evidence exports.

## Controlled delivery

1. Create the schema, indexes, triggers, RLS, and fictional seed.
2. Add email/password authentication and role-aware data access.
3. Add class access/enrolment.
4. Deliver one lesson and one five-question practice activity.
5. Persist attempts atomically; update topic progress and generate a proposed target.
6. Add student and teacher dashboards.
7. Add factual learner evidence export.
8. Add PWA metadata, responsive styles, accessibility, and privacy information.
9. Verify domain rules, permissions, lint, types, and production build.

## Status

- Completed in source: application scaffold, schema and RLS, fictional identities,
  class and curriculum seed, login/registration/password reset, class creation and
  enrolment, lesson and worked example, atomic five-question marking, immutable
  attempts, topic progress, automatic target, role-aware dashboards, teacher
  learner/class detail, PDF/CSV evidence exports, public-shell-only service worker,
  PWA metadata and privacy baseline.
- Verified locally: unit tests, permission matrix tests, report-format tests,
  TypeScript, ESLint, production compilation, and production dependency audit.
- Database verification completed against an isolated PostgreSQL 16 cluster:
  migration, seed, class creation, enrolment, submission, persistence, progress,
  target creation, cross-learner RLS, answer secrecy and teacher access passed.
- Hosted Supabase verification completed: schema applied; 23 expected tables, 22
  RLS policies, five required functions and sensitive-table RLS confirmed.
- Remaining: load curriculum-only data, provision safe fictional Auth users and
  execute the teacher/student browser journey through Supabase Auth/PostgREST.

## Explicit boundaries

Formal qualification assignment submission, marking, grading, resubmission,
plagiarism detection, and qualification decisions are prohibited. The first slice
also excludes AI feedback, SSO, payments, and social features.

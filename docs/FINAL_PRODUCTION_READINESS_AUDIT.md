# Final production readiness audit

Audit date: 14 August 2026

> Historical production record. The invitation lifecycle was deliberately changed
> on 27 August 2026 so new learners are provisioned only after secure acceptance.
> The hosted invitation and recovery journey must be re-tested before this document
> is used as certification for the current build.

## Current decision

**Production readiness checks pass. Real-student invitations may begin through
Hima's controlled teacher invitation form.**

The exposed Gmail App Password was revoked and replaced directly in Supabase.
After rotation, the live recovery endpoint completed successfully and the test
message reached `ghimab@gmail.com`; the unused link was deliberately left
unopened.

## Verified production journeys

| Requirement | Evidence | Result |
| --- | --- | --- |
| Public deployment | Railway production service in EU West | Online |
| Password recovery | Token-hash email opens `/auth/confirm`, requires an intentional Continue action, then opens password setup | Passed with `ghimab@gmail.com` |
| Existing-user sign-in | User set a new password and signed in on the live site | Passed |
| Authentic invitation | Hima invited a new Gmail alias from the teacher class page | Passed |
| Invitation acceptance | Invitee accepted securely, set a password and signed in | Passed |
| Automatic class assignment | Historical eager-provisioning behaviour was observed; the replacement acceptance-gated flow requires a new hosted test | Re-test required |
| Production demo access | Demo selector panel absent; both historical shared-password accounts banned and rejected | Passed |
| Redirect integrity | Public auth redirects use the Railway origin rather than Railway's internal localhost origin | Passed |

## Curriculum and assessment integrity

- Pearson BTEC Level 3 National Information Technology (2016 RQF) Units 1, 2,
  4, 6, 8 and 9 are represented. Hima must confirm this is the exact
  qualification version delivered by the centre before enrolment.
- Every configured topic has a teaching sequence, applied example, pause/check,
  adaptive practice and progression route.
- Units 2, 4 and 6 contain practical assessment rehearsal rather than
  theory-only papers. Unit 2 covers UNF through 3NF, tables, keys, validation,
  SQL queries, forms, reports, testing and evaluation. Unit 4 requires Python
  algorithms, executable code, debugging, tests, refactoring and persistence.
  Unit 6 requires HTML, CSS, JavaScript, debugging, accessibility, testing and
  evaluation.
- Each practical mark maps to one explicit rubric point. Objective answer keys
  are unique and match their displayed model answers. Six consecutive paper
  versions have distinct scenarios and stable mark totals.
- One Unit 2 submission was manually marked point-by-point at 62/66; the
  deductions matched the published rubric.

## Learner-report evidence

- The individual report separates starting point, dated progress, supported and
  independent evidence, teacher feedback, targets, deadlines, learner
  reflection, retrieval, paper history, rewards and exceptional access.
- Missing evidence is stated as missing rather than converted into a progress
  claim. Open practical work is not final until Hima reviews it.
- The PDF generator test passes. The two-page A4 sample was rendered and
  visually checked: headings, evidence sections, dates, page breaks and footer
  are readable with no clipping or overlap.
- The report supports inspection discussion but explicitly does not claim to be
  an Ofsted certificate. Attendance, safeguarding, SEND plans and statutory
  records remain in the centre's approved systems.

## Final automated evidence

- `npm test`: 82 passed; one fixture-generation test intentionally skipped in
  the default suite.
- The skipped fixture test was run explicitly with fixture generation enabled:
  1 passed and the sample PDF was regenerated.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; 82 pages generated and all expected routes present.
- `npm audit --omit=dev`: zero known vulnerabilities after updating the affected
  transitive packages.
- Secret scan: no SMTP password, Gmail App Password or Supabase secret is stored
  in application source. `.env.local` and all `.env*` files are ignored by Git;
  the service-role key is read only by the server-side Supabase admin client.

## Release gate result

- Exposed Gmail App Password revoked: passed.
- Replacement stored directly in encrypted Supabase SMTP settings: passed.
- Post-rotation delivery accepted by Supabase Auth: passed.
- Post-rotation message received at Hima's controlled inbox: passed.
- Controlled invitation-only registration remains the approved learner-onboarding
  route; open public student registration remains unavailable.

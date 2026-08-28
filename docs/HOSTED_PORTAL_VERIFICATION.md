# Hosted portal verification

Use this release gate after deploying a committed revision. It separates safe public
checks from the controlled-account journey that necessarily creates authentication
and invitation records. Never treat an online service or an old historical audit as
proof that the current worktree is deployed.

## 1. Safe public verification

The public verifier performs GET requests only. It checks the home, sign-in,
password-reset and privacy pages; confirms anonymous requests receive sign-in content
instead of protected dashboard data; and compares the safe `/api/release` identity
with the revision intended for release.

```powershell
$commit = git rev-parse HEAD
powershell -ExecutionPolicy Bypass -File .\scripts\verify-hosted-public.ps1 `
  -BaseUrl "https://YOUR-HOST" `
  -ExpectedCommit $commit
```

Do not omit `-ExpectedCommit` for a release decision. A missing or mismatched commit
means the live service is not proven to contain the audited code.

## 2. Controlled invitation and role journey

Run this in a dedicated hosted test environment unless the owner explicitly approves
creating test operational records in production. Use a controlled teacher identity
and a fresh controlled student inbox; never use a real learner. Do not store passwords,
one-time links or tokens in this repository or the test record.

Record the environment, expected commit, tester, UTC timestamps, class ID and durable
invitation ID, then verify:

1. The environment has curriculum definitions but no unintended student, enrolment,
   attempt, target or evidence records before the journey.
2. The teacher account resolves to exactly the teacher dashboard. It cannot open
   learner-only progress or submission controls.
3. The teacher creates one test group, selects and publishes an approved unit, then
   sends one invitation to the controlled student inbox.
4. The invitation ledger says sent or awaiting response—not joined. No student
   profile, active enrolment or learning journey exists before acceptance.
5. The inbox receives the current message and its HTTPS link uses the expected host.
6. The recipient intentionally accepts, sets the password themselves and signs in.
7. The durable invitation is accepted, one student profile exists, one active
   enrolment points to the exact class, and the group journey starts once only when
   an approved active-unit template exists.
8. The student sees the student dashboard and its truthful first next action. No
   teacher or administrator control is visible or reachable by a manually entered URL.
9. The teacher sees the joined learner in the exact class with starting point,
   progress and assessment evidence still explicitly unrecorded until genuine work.
10. A second acceptance/finalisation attempt is idempotent and cannot create a second
    profile, enrolment or journey.
11. Cancellation, expiry and retry are exercised with separate unused invitations;
    an old cancelled or expired link cannot finalise access.
12. The result record distinguishes email delivery, link verification, account role,
    class association, journey activation and route isolation. “Invitation sent” is
    never recorded as “student joined.”

Any cleanup or environment reset is a separate destructive operation and requires
the environment owner's explicit approval. Preserve the verification record and the
relevant immutable audit facts before resetting a dedicated test environment.

## Current evidence boundary

The repository's automated tests and clean-database journeys prove the acceptance,
role, RLS, idempotence and journey-activation contracts locally. The checklist above
is still required to prove SMTP delivery, allowed redirects, the deployed revision
and actual browser behavior. Without both stages, hosted invitation readiness remains
unverified.

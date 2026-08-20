# First vertical slice completion audit

Status on 27 July 2026: **implemented, deployed to Supabase and verified through
an authenticated two-role browser journey**.

| Completion requirement | Authoritative implementation evidence | Verification |
|---|---|---|
| Teacher can create/access a class | `create_class` RPC, teacher dashboard form and class page | RPC executed successfully as fictional teacher |
| Student can enrol | `join_class` RPC and learner dashboard form | RPC executed successfully with hashed code |
| Student can complete learning activity | seeded lesson/activity and five-question form | Authenticated learner completed all five questions in the browser |
| Answers automatically marked | transactional `submit_activity` RPC and pure domain tests | Hosted submission returned 6/6, 100%, Mastery and five feedback rows |
| Result remains after logout | immutable `attempts` and `attempt_answers` tables | Learner signed out and back in; 100%, Mastery and target persisted |
| Topic progress updates | upsert inside the submission transaction | Hosted learner and teacher views showed 100% topic progress |
| Target generated | proposed measurable target inside the submission transaction | Hosted learner and teacher views showed the dated 90% review target |
| Teacher sees individual result | learner page, attempt timeline and RLS-authorised query | Teacher saw learner name, topic, scores, target and dated attempt |
| Teacher sees class summary | class roster plus learner score/pathway | Teacher saw one learner with 100% and Mastery |
| Learner cannot see another learner | `can_access_learner`, RLS policies and security assertions | Cross-learner attempt/profile checks passed |
| Teacher exports progress report | private/no-store PDF and CSV route | CSV unit test and route build pass; authenticated HTTP pending |
| Tests pass | Vitest domain/permission/report suite | 10/10 pass |
| Setup documented | root README and `.env.example` | Present |

## Verified commands

- `npm test`: 3 files, 10 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed without warnings after correction.
- `npm run build`: production build passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Built HTTP smoke test: `/`, `/login`, `/forgot-password`, `/privacy`,
  `/manifest.webmanifest`, and `/sw.js` returned HTTP 200.
- PostgreSQL 16 isolated integration: migration and fictional seed applied without
  error; `vertical_slice_journey.sql` passed teacher class creation, enrolment,
  deterministic submission, persistence, progress, target, cross-learner RLS,
  answer secrecy and teacher visibility.
- Hosted Supabase project `hkcwiqdonltagavkmkgk`: migration and hosted-safe
  curriculum seed executed successfully. Read-only verification returned 23/23
  expected tables, 5/5 required functions and RLS enabled across the sensitive
  learner and operational tables.
- Hosted browser journey: fictional teacher created a class; fictional learner
  joined with its hashed enrolment code, submitted five correct answers, received
  6/6 and Mastery, signed out and back in, and retained the result and target.
  The teacher then saw the learner in the class roster and the complete individual
  evidence timeline.
- Final customer-facing browser audit: all three home-page entry links navigated,
  student and teacher demo selectors pre-filled the correct fictional accounts,
  both sign-in actions reached their role dashboards, the learner completed a
  second five-question 6/6 attempt with five feedback items, and the teacher
  opened the class, learner evidence, CSV export and PDF export.
- Local reliability: development mode unregisters stale production service
  workers and clears Hima public caches so a stopped local server can no longer
  make sign-in links appear to return silently to the home page.
- Supabase security-advisor findings for the four operational tables were
  remediated with RLS and scoped policies.

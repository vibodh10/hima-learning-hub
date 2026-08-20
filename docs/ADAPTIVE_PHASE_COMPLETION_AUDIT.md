# Adaptive learning phase: completion audit

Audit date: 28 July 2026.

## Evidence currently proved

| Requirement | Authoritative evidence | Status |
|---|---|---|
| Existing logins and dashboards remain | Hosted browser sign-in succeeded for both fictional accounts; legacy database journey passes | Proved |
| Correct BTEC course and units | Hosted student dashboard displays the corrected course; adaptive seed defines the five exact units | Proved |
| Flexible curriculum and hidden T Level placeholder | Migration 002 plus adaptive seed; draft-safe RLS | Proved |
| Student learns before practising | Hosted browser rendered five teaching screens and three worked examples | Proved |
| At least 25 meaningful interactions | Hosted lesson displayed 34; database counts are 6 guided, 12 core, 6 challenge, 5 mastery and 5 retrieval | Proved |
| Every pilot question has a skill | Fresh-database seed and journey checks; 34 mapped question rows | Proved |
| Controlled variations | Hosted deterministic question template plus three stored, approved parameter variants | Proved |
| Immutable attempts and skill mastery | Hosted browser stored two separate guided attempts; adaptive database journey passes | Proved |
| Hints affect mastery | Hosted submission function and database test prove a 100% result with all six hints is Stretch, not Mastery | Proved |
| Weak skills can move and create targets | Submission engine updates each skill, permits movement in either direction and creates a lowest-skill target | Proved |
| Later different-question retrieval | Mastery journey schedules the separate five-question retrieval activity for seven days later and asserts no shared question IDs | Proved |
| Badges and non-farmable coins | Hosted first completion awarded evidence; repeat awarded no coins; idempotency test passes | Proved |
| Cosmetic purchase | Hosted Ocean theme purchase changed balance from 100 to 60 and created a ledger debit | Proved |
| Teacher content and learner controls | Hosted server RPCs, content editor, full learner page and teacher-control journey pass | Proved |
| Gamification can be disabled | Hosted submission function honours the settings; database test proves no badge, coin or streak mutation | Proved |
| Cross-learner isolation | Legacy and adaptive negative RLS journeys pass | Proved |
| Formal assignments remain absent | Route/source scan and explicit scope copy; no assignment tables or routes | Proved |
| TypeScript and lint | `npm run typecheck` and `npm run lint` exited successfully | Proved |
| Component tests | `npm test` completed with 3 files and 10 tests passing | Proved |
| Production build | `npm run build` completed all compilation, type, page-data and static-generation stages | Proved |
| Hosted migration state | Supabase reports local and remote versions `202607270001` through `202607270004` in sync | Proved |
| Hosted pilot inventory | Read-only hosted query reports 6 activities, 39 approved questions, 3 worked examples and 3 approved controlled variants | Proved |

## Verification note

pgTAP assertions remain unavailable in the temporary PostgreSQL installation.
The equivalent plain SQL security and journey suites pass from a fresh schema,
including the legacy vertical slice, adaptive learner journey, and teacher
adaptive-control journey.

The adaptive-learning phase is complete against the stated acceptance criteria.

# Portal foundation audit and implementation record

Date: 27 August 2026

## Outcome

The application should be extended, not rebuilt. Its current Supabase and Next.js
architecture already provides most of the high-risk foundation requested in the
teacher-led portal brief. The implementation extends those foundations with
role-appropriate next actions, durable invitation monitoring and a clear
learner-facing unit/module/lesson hierarchy instead of creating parallel systems.

## Reusable architecture already present

### Application and authentication

- Next.js 16 App Router with Server Components, Server Actions and Route Handlers.
- Supabase Auth for verified email/password sessions and secure invitation links.
- `user_profiles.role` is the authoritative application role. One profile has one
  role: `student`, `teacher` or `administrator`.
- The public sign-in form does not allow a user to choose or switch role.
- Student self-registration is not offered; student provisioning is invitation
  only. Teacher provisioning requires administrator approval.
- Private pages perform server-side role checks. Student-only progress, portfolio
  and rewards pages reject staff accounts; teacher learner/class pages reject
  student accounts; administrator pages reject both ordinary roles.
- Mutating actions repeat identity/role checks and PostgreSQL row-level security is
  the final data boundary. A student cannot gain teacher access by entering a URL.

### Curriculum and teaching structure

- Reusable courses, curriculum versions, units, learning aims, topics, lessons,
  teaching screens, worked examples, activities, questions, skills and
  misconceptions already exist.
- Classes link to selected units through reusable `class_units`; curriculum is not
  duplicated per teacher or learner.
- The approved BTEC Unit 4 Python pilot already demonstrates short teaching,
  examples, guided/core/challenge/mastery practice and later retrieval.
- The T Level catalogue exists as governed data, but approved teaching content has
  not been supplied. The portal correctly avoids inventing it.

The stored hierarchy remains `Course → Unit → Topic → Lesson → Activity`, preserving
Pearson topic codes and existing evidence keys. In the learner experience, each
official topic is now presented as a numbered **module** containing short lesson
cards, quick checks, adaptive questions and worksheet evidence. This provides the
requested `Course → Unit → Module → Lesson → Activity` experience without adding a
second curriculum tree or changing existing evidence identities.

### Teacher workflow

- A teacher can create a group, choose a programme, select and publish units, then
  invite students.
- Invitation records and events are durable and auditable. Existing accounts are
  resolved safely, staff accounts cannot be enrolled as students, and enrolment is
  associated with the selected class.
- Class dashboards already provide learner starting/current positions, progress,
  attention status, evidence links, common misconceptions and report exports.
- Teachers can record feedback, targets, interventions and professional judgement;
  automated records remain evidence-backed and teacher-editable where appropriate.

### Learning, evidence and reporting

- Course/unit starting points reuse the assessment engine and are stored as
  immutable evidence.
- Attempts, answers, first/repeat attempt context, skill mastery, misconceptions,
  retrieval schedules, progress comparisons and activity completion are persisted.
- Versioned worksheets/portfolio artefacts, catch-up records, teacher feedback,
  targets, interventions, achievement events and progress snapshots are available.
- Individual, class and class-unit PDF/CSV reports are built from stored facts and preserve
  missing-data states rather than fabricating narrative.

### Empty operational state

- Runtime dashboards use database counts and explicit empty states; they do not
  manufacture learners, enrolments, attempts or success statistics.
- `seed_hosted_curriculum.sql` contains curriculum only. The legacy `seed.sql` and
  complete-system seed contain fictional local verification identities/groups and
  must remain limited to disposable local/database-test environments.

## Gap selected for this slice

The student dashboard contained the right evidence but buried the main action below
journey, catch-up, feedback and metric sections. It could also fall back to the Unit
4 Python pilot even when that was not the learner's truthful next assigned item.

The new `selectStudentNextAction` decision layer chooses one action in this order:

1. incomplete course starting point;
2. open catch-up learning;
3. earliest outstanding allocated classwork/homework;
4. current group-journey topic;
5. linked target practice;
6. assigned unit;
7. approved Unit 4 lesson fallback only when Unit 4 is active.

The dashboard now places that action immediately below the student welcome, uses one
clear button, explains that progress is saved, and shows a truthful preparation
empty state when no action exists. The earlier duplicate Python-specific Continue
card and duplicate starting-point card were removed; detailed evidence remains
available further down the page.

### Teacher next action

The teacher dashboard previously showed four generic setup cards, live totals and a
second zero-student prompt at the same time. The new `selectTeacherNextAction`
projection chooses one real action:

1. review a learner with intervention, action or catch-up evidence;
2. create the first group;
3. choose units for an incomplete group;
4. publish selected units;
5. track already-sent invitations;
6. invite students where no invitation is pending;
7. monitor the largest active group when no urgent action exists.

The generic setup cards and duplicate zero-student prompt were removed. Live totals,
the learner priority table and analytical evidence remain available below the one
primary action.

### Durable invitation monitoring

The class page now reads the existing RLS-protected invitation ledger and displays
safe teacher-facing states for preparing, sent, connection pending, joined, failed,
expired and cancelled invitations. It shows send/join dates and resend count without
exposing raw tokens or internal failure codes. The teacher dashboard counts pending
or sent invitations and links to this ledger instead of telling the teacher to send
the same invitations again.

### Controlled invitation acceptance and recovery

A newly requested Auth invitation no longer creates a learner profile or active
enrolment before the recipient proves control of the invited email address. The
profile, class enrolment and accepted ledger transition are completed together only
after secure invite or recovery verification. Existing established student accounts
can still be assigned immediately after the exact email, organisation and role checks
pass.

Teachers and administrators who manage the class can now cancel, explicitly expire,
or retry an unaccepted invitation from its ledger. Cancellation and expiry are atomic
database transitions with immutable events and audit records; accepted invitations
cannot be rolled back through these controls, and students have neither RPC nor direct
table-mutation access. Finalisation rejects pending, failed, expired and cancelled
records even if an older Auth link later verifies. Retry sends a new invite for a new
Auth user or a password-recovery access email for an Auth account that has not yet
finished provisioning. Recovery metadata is rebound to the current durable invitation
instead of trusting stale link state.

For records created by the earlier eager-provisioning workflow, cancellation archives
only the provisional class enrolment when there is no accepted invitation event or
independent `enrolment.joined` audit fact. The learner profile and all stored evidence
remain intact. This gives teachers a real access boundary without fabricating or
deleting operational learning data.

### Automatic first-student journey activation

The shared teaching journey now starts automatically when the first invitation is
genuinely accepted. A database trigger requires all three durable facts before it
acts: `accepted` invitation status, a linked student account, and an active
enrolment in the class. Merely requesting or sending an email cannot start a
journey. The trigger selects the latest approved template for the class's active
unit, starts it once, and records a `group_journey.auto_started` audit event.

Invitation acceptance remains available when a selected unit has no approved
journey; the portal does not invent a sequence or fail student onboarding. The
teacher class page reports that state plainly. The former manual start form is now
shown only as recovery for a legacy class that already has students but no journey,
and later accepted invitations cannot silently restart a completed journey.

### Learner-facing modules and short lessons

The existing official Pearson topic boundaries are now labelled as numbered modules
on learner pages. Module pages explicitly identify their Pearson topic code and lead
through short 2–4 minute lesson cards, checks, adaptive practice and saved worksheet
evidence. Internal topic keys and teacher curriculum-governance terminology remain
unchanged so historical progress and curriculum mappings are preserved.

The topic summary previously described itself as a short teaching video and advanced
on a timer even though it contained only generated text panels. That contradicted the
explicit no-video requirement and made the pace partly system-controlled. It is now a
learner-paced six-step guided explanation with short text, worked examples and a quick
check. There is no play/pause control or automatic progression, and a component test
guards that contract.

### Exact learner continuation

The curriculum progress loader now reconstructs the most recently updated incomplete
module from `learner_curriculum_progress` instead of relying only on browser storage.
The student dashboard prioritises this saved module position after required starting
point, catch-up and allocated work. Module lesson-card navigation records
`lesson:1`, `lesson:2`, and so on, while entry into adaptive questions records
`practice`. Opening the module on another signed-in device restores that server-backed
position and preserves existing lesson, practice and mastery evidence during updates.

Database-driven activities now have an equally durable continuation boundary without
being treated as academic evidence. Opening an approved, released activity records
only its learner, lesson, activity and last-opened time through a hardened PostgreSQL
function. The function accepts students only, verifies the lesson/activity relationship
and reuses the existing assigned-unit access boundary; browser clients cannot mutate
the table directly.

On the next dashboard visit, the saved activity is reconciled with the authoritative
`learner_activity_states` projection. An activity still in progress, available or
requiring additional practice is resumed directly. If it has been completed, the
dashboard advances to the next genuinely available activity in that lesson; locked,
scheduled or fully completed sequences do not create a false continuation. When both
a static module position and database activity position exist, their persisted update
times decide which was most recently used. No partial answer, attempt, mark or
completion is fabricated merely because a learner opened a page.

### Unit-scoped evidence reports

Teachers can now export a selected unit for one class as private, non-cached PDF or
CSV from the class page. The route repeats the staff-role check, verifies that the
unit is an active selection for an RLS-visible class, and excludes archived
enrolments. It does not rely on a unit identifier supplied by the browser alone.

The shared projection uses only stored, unit-scoped facts: approved modules,
diagnostic and comparable starting-point evidence, secure mastery, question/paper
attempts, reviewed feedback and later attempts, targets, portfolio artefacts,
worksheets, catch-up and workbook teacher decisions. It identifies attention only
from explicit rules such as overdue targets, outstanding catch-up, repeated low
attempts or declining comparable evidence. Missing and insufficient evidence are
labelled rather than converted into progress claims. A rendered A4 fixture was
visually checked for pagination, margins, section flow, headers and footers.

### Whole-class report evidence boundaries

The existing whole-class export previously included archived enrolments, treated a
first practice score as a starting point, counted attempts outside the class's
allocations, and did not constrain skill evidence to active selected units. The
route now validates its class identifier, repeats the staff evidence permission,
requires an active RLS-visible class, and builds the cohort only from active
enrolments and active non-archived unit selections.

Starting averages now include only sufficient stored starting-point evidence.
Latest results and change are included only from dated comparable progress points.
Pathways, misconceptions and allocations are filtered through the approved topics
of the selected units. Exact-class class-wide and learner-specific allocations are
combined, while one legacy unlinked attempt can complete at most one labelled
legacy allocation. Archived
learner actions are excluded from the active cohort report, query failures return a
private error rather than an empty-looking report, and a report that reaches an
evidence query cap stops with a safe unit-report instruction instead of silently
truncating. Both formats are private, non-cached downloads. A fictional two-page A4 fixture was rendered and inspected
for running headers, pagination, margins, section flow and footers.

### Exact class scope for allocated activity evidence

Personalised adaptive homework previously stored only a learner ID even when it
was allocated from a class. That made the authoritative allocation row ambiguous,
hid personalised work from some class filters and allowed a learner allocation to
be attributed to the wrong class when two groups delivered the same unit. The
allocation RPCs now require one exact managed class, require a personalised learner
to have an active enrolment in that class, and require the activity or topic to
belong to an active selected unit. Every new row records both class and learner when
appropriate. Direct insert, update and delete privileges have been removed from
authenticated clients; audited security-definer functions are the mutation path.

Historical learner-only rows are backfilled only when one active selected-unit
enrolment proves the class. Ambiguous rows remain explicitly labelled as legacy
unscoped evidence instead of being guessed. On successful submission, the existing
marking engine now attaches the returned attempt to one released applicable
allocation. Student dashboard, teacher completion filters and class exports share
one matcher: explicit allocations require their exact allocation ID, while a
legacy unlinked attempt may satisfy at most one labelled legacy allocation.

The teacher priority projection counts only released, required allocations that
apply to that learner in that class. It also presents stored overdue active targets,
repeated low attempts in one module and declining comparable skill evidence, while
retaining open interventions and teaching-week catch-up as higher-priority facts.
It does not infer attendance, motivation or inactivity from elapsed wall-clock time.
Automatically generated targets inherit the allocation's exact class; old unlinked
attempts receive class scope only when one active selected-unit enrolment is possible.

### Administrator configuration mutation boundary

Legacy grants still allowed an authenticated teacher to write learning aims, skills,
teaching screens, worked examples, weekly plans, weekly-plan membership and
gamification settings directly, even though supported configuration functions had
subsequently become administrator-only. Those grants and write policies are now
removed. Existing RLS-controlled reads remain available, but authenticated clients
cannot insert, update or delete configuration rows directly, including from an
administrator session.

Weekly plans, gamification switches and coin rules remain configurable through
security-definer functions that now separate a genuine administrator authorisation
failure from invalid input and continue to write audit facts. The other legacy
tables have no current client editing workflow; future editing must introduce an
audited administrator function instead of restoring broad table DML. A clean-
database contract checks every table privilege, exercises actual rejected writes,
proves an ordinary teacher cannot call the administrator plan function and verifies
that supported administrator changes still persist and audit correctly.

### Individual learner report class scope

The learner export formerly chose the first RLS-visible active enrolment while
querying academic evidence for the learner across every course. That could label a
report with one class while including attempts, progress, feedback or targets from
another programme. Staff exports now require an explicit valid class identifier and
verify the learner has an active RLS-visible enrolment in that exact class.

Academic skills, attempts, targets, comparable progress, mastery, feedback,
misconceptions, retrieval and exceptional access are restricted to active selected
units, while the course starting point and prior-experience context remain available.
Snapshots, teacher actions, recognitions and attendance are restricted directly by
class; workbook attempts, worksheets, portfolio and catch-up evidence are restricted
by selected unit code. Organisation-wide badges, coins and certificate eligibility
remain clearly separate engagement evidence rather than academic progress. Missing
class context, query errors and potential query truncation fail closed. Teacher
dashboard, class and learner links now carry the class context, and staff with more
than one visible enrolment can choose the programme before exporting.

### On-screen learner evidence scope

The teacher learner overview and before/after evidence view now use the same class
boundary as the export. The selected programme determines the active unit IDs and
unit codes used for academic skills, comparisons, mastery, attempts, targets,
feedback, misconceptions, retrieval, assessment history, overrides, adaptive
workbook progress and teacher decisions. Class-linked actions, snapshots and
recognitions use the exact class ID. The evidence view queries worksheets and
portfolio artifacts only for active selected unit codes and preserves class context
through its filters and navigation.

Organisation-wide achievement points, badges and coins are labelled as such rather
than presented as class academic progress.
Failed evidence queries stop the page rather than displaying a false empty state,
and controls for pathway, activity override and workbook decisions receive only the
selected programme's skills, activities and configured units.

### Class-scoped private teacher notes

New personal teacher notes now record an exact class as well as learner and author.
The hardened database function accepts only a teacher or administrator who manages
that class, confirms the learner has an active enrolment there, enforces the same
organisation boundary and writes an audit fact without duplicating the note text in
the general audit ledger. Teachers see only their own notes; same-organisation
administrators may read them for governance. Students have no read or write path.

The learner overview filters notes to its selected class before rendering them and
provides a clearly private note control in that context. Existing notes remain with
a null class rather than being assigned speculatively. They are separated as
historical unscoped notes and explicitly excluded from class-scoped evidence.

### Whole-class curriculum decision table

The teacher class page now leads its learner evidence with the required seven-column
decision table: Student, Starting Point, Unit Progress, Current Module, Assessment,
Targets and Attention. Every learner name opens that learner's record with the exact
class context, and each evidence cell links to the corresponding class-scoped evidence
view. The responsive container retains all columns for desktop scanning without
discarding written status labels when horizontal space is constrained.

The table is a deterministic projection of stored evidence for the class's active
unit. Unit progress counts only modules with recorded curriculum progress and calls a
unit complete only when every configured module is independently mastered. The latest
incomplete module supplies the current position. Assessment combines completed
exact-class assessment instances with completed mixed-topic practice papers for the
active unit; topic drills are excluded. A reviewed assignment uses its teacher-awarded
mark, while an assignment awaiting review remains explicitly unmarked. Active targets
are exact-class records, and attention comes from the existing class projection.

Missing starting points, progress, assessments, targets and attention are stated as
missing rather than converted to zeros or positive status. If any required evidence
query fails, the entire projection fails closed behind an availability message instead
of presenting a deceptively empty class. The pure projection and rendered table have
focused tests for empty evidence, independent mastery, current-module choice, latest
assessment, overdue targets, attention labels, active-unit paper filtering, reviewed
assignment marks, exact column headings and class-preserving links.

### Hosted release identity and public smoke boundary

An online deployment is no longer treated as proof that the audited revision is
running. The public `/api/release` route returns only a validated Git commit,
recognised environment label and fixed service identity, with private caching
disabled. Arbitrary environment values are not echoed. Railway supplies the commit
SHA for Git-triggered builds, while other hosts can inject the supported generic
commit variable.

The read-only `scripts/verify-hosted-public.ps1` gate checks that commit against the
intended revision, verifies the public home, role-neutral sign-in, password-reset and
privacy pages, and confirms anonymous requests do not receive dashboard, administrator,
teacher-class or learner-progress content. The script was exercised successfully
against this worktree on a local Next.js server and creates no account, invitation or
learning record.

On 28 August 2026 the linked Railway production service was online and its public
routes rendered successfully. Browser checks also confirmed anonymous protection for
the four private route families. The live service returned its not-found page for
`/api/release`, proving that its current deployment cannot be claimed to contain this
uncommitted worktree. No production sign-in, form submission or data mutation was
performed. The exact controlled-account process and evidence record are defined in
`docs/HOSTED_PORTAL_VERIFICATION.md`.

### Explicit teaching and administration permissions

The application permission layer now distinguishes three staff boundaries instead
of reusing a group-creation permission for unrelated work. Teachers and
administrators can perform ordinary teaching actions such as reviewing responses,
recording feedback and targets, and working with evidence. A teacher can set up only
a group they own through the separately named owned-group boundary. Advanced group
configuration and lifecycle operations, including thresholds, weekly plans, manual
allocation, coin rules and corrections, class duplication or archiving, co-teacher
changes, learner moves and enrolment archiving, require administrator mode before a
server action reaches the database. Students satisfy none of these staff boundaries.

This split mirrors the simplified interface: ordinary teachers see their groups,
students, progress, invitations and evidence rather than administration controls.
The database functions continue to repeat organisation, role and exact-class checks;
the application check is an additional fail-early boundary, not a replacement for
row-level or function-level authorisation.

The administrator page leads with the normal Groups workflow and keeps occasional
organisation-wide controls inside a collapsed Advanced administration section. No
audit-log viewer or audit-retention control is shown in the interface. Existing
security records remain protected internally rather than being deleted.

Regression contracts enumerate the protected administrator, teacher, student and
assigned-unit pages and the three private report routes. They also assert that the
deliberately public course-readiness calculation has no Supabase or database mutation
path, and that invitation callbacks validate internal destinations and finalise the
durable invitation before redirecting. A separate hosted-seed contract rejects Auth,
profile, class, enrolment, invitation, attempt, target, feedback and reward writes so
reusable curriculum cannot silently become fabricated operational data.

Direct database reads of approved lessons and activities also call the
`can_access_unit` row-level boundary. For students, that boundary requires an active
enrolment, a published non-archived class and an active non-archived class-unit
selection. Course starting-point Unit 1 remains the sole documented course-wide
exception for an enrolled learner. Staff retain curriculum preview access.

The final class and learner access helpers replace an older broad administrator
shortcut. Administrators can manage or read a class only when the class and their
active profile share an organisation. Teachers additionally require ownership or an
active co-teacher assignment. A teacher can read a learner only through that
learner's active enrolment in such a class. Students can read only their own learner
record and classes in which they have an active enrolment. A regression contract
pins these organisation, archive, role, assignment and enrolment conditions to the
latest helper definitions.

The profile table has a read policy but no browser-role insert, update or delete
policy. Users therefore cannot promote themselves, change organisation or create a
second application role by calling the database API directly. Profile role and
archive changes use the administrator governance function, remain organisation
scoped, and reject an administrator attempting to demote or archive their own active
administrator profile.

The Server Action contract covers 66 exported mutations across learning, curriculum,
worksheets, invitations, staff accounts and curriculum-attempt review. Each file is
server-only and every exported mutation establishes the current profile or requires
an explicit role before validating input or reaching Supabase. Public sign-in,
sign-out and password recovery are tested separately because they intentionally begin
without an existing application profile.

Tutor onboarding includes Himabindu Gunde and the named tutors supplied for this
programme. Creating or resending teacher access is administrator-only. The account
lookup normalises the verified college email and scans the complete paginated Auth
directory before deciding that an address is new; any directory error fails closed,
so the portal cannot silently create a duplicate account. Teacher addresses must use
the exact `@sccb.ac.uk` domain. If an Auth account already exists, its active teacher
profile, organisation and display name must all match the selected tutor before a
password-setup link can be sent.

Class assessment dates now repeat the same access boundary. An active learner can
read dates only for a class in which they are actively enrolled. A teacher can read
and create dates only for a class they own or actively co-teach. Administrators remain
restricted to their organisation and are the only role allowed to create
organisation-wide dates. An activity-linked date is also rejected unless that
activity belongs to an active unit selected for the class. The database regression
journey proves the owning teacher, enrolled learner, unrelated teacher, unrelated
learner, same-organisation administrator and external-organisation administrator
cases independently.

Professional intervention records are now stricter than ordinary class resources.
Students cannot read intervention rows, including rows for their own class, because
these records may contain staff-only evidence and notes. An owning or actively
assigned teacher can read a row only when the named learner is actively enrolled in
the exact class; a same-organisation administrator has the same exact-class boundary.
Unrelated staff and external-organisation administrators receive no rows. Direct
browser insert, update and delete privileges are revoked so intervention history can
only be changed through an explicitly authorised server workflow.

## Verification

- TypeScript: passed.
- ESLint: passed.
- Full suite after the slices: 323 unique tests passed, with 3 opt-in artifact-generation tests skipped by default.
- PostgreSQL contract: 45 independent journeys passed from clean databases,
  including sent-versus-accepted activation, invitation cancellation/expiry,
  exact allocation completion, allocation and configuration direct-mutation denial,
  idempotence, auditing, the current tutor-owned group-creation boundary and
  class-scoped assessment dates and staff-only interventions.
- Student/teacher next-action, invitation presentation, saved curriculum position,
  curriculum, permission, role-navigation and sign-in coverage passed.
- Next.js production build: passed; all 25 static-generation tasks completed and
  all dynamic application and API routes compiled.

## Recommended next slices

1. Open only the newest controlled-student email sent after the Supabase Auth Site URL
   and callback allow list were corrected to the canonical SCCB origin. Complete the
   hosted acceptance journey with distinct teacher and student accounts. The database
   acceptance/activation contract and live URL configuration are covered; the newest
   email link and authenticated browser journey are not yet proven.
2. Move secondary teacher analytics behind class/unit drill-downs after observing
   the new priority action with real tutors.
3. Pilot and approve one complete module/lesson sequence per selected unit before
   expanding content; do not bulk-generate unsupported qualification material.
4. Observe unit reports with real tutors and only add new sections where the
   underlying evidence is already stored and traceable to learner activity.

The requirement-by-requirement proof status, including external and partial items, is
maintained in `docs/PORTAL_REQUIREMENT_EVIDENCE_MATRIX_2026-08-28.md`.

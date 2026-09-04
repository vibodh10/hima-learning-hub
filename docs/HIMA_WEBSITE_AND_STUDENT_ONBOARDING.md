# How Hima Learning Hub was built

## A clear, honest explanation Hima can give

> I designed Hima Learning Hub around the Pearson BTEC Level 3 Information Technology curriculum and the way I want my students to learn. I specified the units, teaching sequence, practical expectations, pathways and reports, and I reviewed the educational content. I used AI-assisted software development in Codex to help implement and test the platform. The website is built with Next.js, React and TypeScript, with Supabase providing secure accounts, classes, learner evidence and reports. The assessment content is original practice material mapped to Pearson requirements; it does not copy live Pearson papers.

If a shorter answer is needed:

> I designed the teaching and assessment model, then built it with AI-assisted development using Next.js and Supabase. I reviewed the Pearson alignment and tested the learner and teacher journeys myself.

## What the main technology does

- **Next.js, React and TypeScript** provide the website, lessons, adaptive questions, practical papers and teacher screens.
- **Supabase Auth** provides secure sign-in, email invitations and controlled
  class-link registration.
- **PostgreSQL and row-level security** keep each learner's evidence within the correct organisation and class.
- **The Hima question engine** generates original comparable practice from controlled templates. It stores marks, hints, time and question evidence.
- **Reports** turn stored evidence into strengths, support needs, targets, progress history and recommended next steps.
- **Automated tests plus browser testing** check the curriculum map, question coverage, security rules and important navigation journeys.

# Student registration: controlled access only

Open student self-registration remains disabled. Hima can use a one-person email
invitation or generate one temporary registration link for an exact published group.
The class link is designed for cases where college email filtering blocks invitation
messages. It is unguessable, expires after seven days, accepts at most 100 successful
registrations and can be closed immediately. It must be shared only with the intended
class through a college-approved channel.

## One-time setup

1. In Supabase Authentication, enable email authentication.
2. Configure the email sender and customise the **Invite user** email template with Hima Learning Hub wording.
3. Keep the intentional confirmation screen in the invitation template so email-security scanners cannot consume the link before the student clicks Continue:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/update-password`
4. Add the live website callback route to Supabase's allowed redirect URLs. The
   portal appends a non-secret invitation identifier so acceptance can be bound to
   the durable ledger record; allow the callback route's query variants, for example:
   `https://YOUR-DOMAIN/auth/callback**`
5. Set server-only `APP_URL=https://YOUR-DOMAIN` to the same public HTTPS origin. Do not use Railway's internal localhost address.
6. Keep `SUPABASE_SERVICE_ROLE_KEY` only in the server's environment settings. Never place it in a variable beginning `NEXT_PUBLIC_`, in browser code, screenshots or emails.
7. Confirm that the public `/register` page is used only for controlled teaching-staff requests. Students must not use it.

## Recommended route when college email blocks invitations

1. Sign in as the teacher and open the intended group.
2. Under **Student registration link**, select **Create registration link**.
3. Copy the displayed link and share it only with that class.
4. Ask learners to open it, confirm the group shown and register with their own email.
5. Once the intended learners have joined, select **Close registration link**.
6. Confirm the group count and invitation/join evidence before using reports.

The link contains the secret. Do not post it publicly or reuse it for another class.
Creating a replacement closes the earlier link. Closing it blocks further joins but
does not remove learners who have already registered or their evidence.

## How Hima invites a student

1. Sign in as Hima.
2. Open **Dashboard → the student's class**.
3. Find **Authentic registration → Invite a student securely**.
4. Enter the student's full name and verified email address.
5. Select **Send secure invitation**.
6. The portal records the invitation lifecycle without storing the one-time token. A new account receives a single-account Supabase invitation; a safe existing student account is connected without sending a duplicate invitation. Staff, archived and cross-organisation account collisions are blocked.

## What the student does

1. Open the invitation in the same email inbox that Hima invited.
2. Follow the link to Hima Learning Hub.
3. Press **Continue securely**, then set a password of at least ten characters.
4. The portal opens the student's dashboard after the password is saved.
5. Secure acceptance creates or confirms the student profile and class enrolment;
   the assigned class and units then appear automatically. A temporary finalisation
   failure is retried on the next valid sign-in. The student does not need a public
   enrolment code.

For the class-link route, the learner opens the shared link, sees the exact group and
course, then either creates a student account or signs in to an existing student
account. Successful registration creates the exact class enrolment and approved
journey together. The dashboard then presents the assigned starting-point assessment
as the first action. A staff account, archived account or account belonging to a
different organisation cannot use the link as a student.

Teachers can cancel or mark an unaccepted invitation as expired from the class
ledger. Either state prevents subsequent application provisioning. **Send another
access email** creates a fresh invite or recovery path without storing or displaying
an Auth token.

## Before inviting real students

- Send one invitation to a test student email that Hima controls.
- Confirm the email arrives, the password can be set and the learner lands in the correct class.
- Complete one lesson and practical paper, then confirm the evidence appears in Hima's learner report.
- Confirm that a student cannot open another learner's report or any Hima-only page.
- Only after this test should real student invitations be sent.
- If using a class link, confirm it cannot be used again after the teacher closes it.

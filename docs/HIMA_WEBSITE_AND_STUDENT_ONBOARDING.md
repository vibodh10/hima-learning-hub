# How Hima Learning Hub was built

## A clear, honest explanation Hima can give

> I designed Hima Learning Hub around the Pearson BTEC Level 3 Information Technology curriculum and the way I want my students to learn. I specified the units, teaching sequence, practical expectations, pathways and reports, and I reviewed the educational content. I used AI-assisted software development in Codex to help implement and test the platform. The website is built with Next.js, React and TypeScript, with Supabase providing secure accounts, classes, learner evidence and reports. The assessment content is original practice material mapped to Pearson requirements; it does not copy live Pearson papers.

If a shorter answer is needed:

> I designed the teaching and assessment model, then built it with AI-assisted development using Next.js and Supabase. I reviewed the Pearson alignment and tested the learner and teacher journeys myself.

## What the main technology does

- **Next.js, React and TypeScript** provide the website, lessons, adaptive questions, practical papers and teacher screens.
- **Supabase Auth** provides secure sign-in and email invitations.
- **PostgreSQL and row-level security** keep each learner's evidence within the correct organisation and class.
- **The Hima question engine** generates original comparable practice from controlled templates. It stores marks, hints, time and question evidence.
- **Reports** turn stored evidence into strengths, support needs, targets, progress history and recommended next steps.
- **Automated tests plus browser testing** check the curriculum map, question coverage, security rules and important navigation journeys.

# Student registration: invitation only

Open student self-registration should remain disabled. Hima should invite each student using a known college or verified personal email. This is safer than publishing a reusable class code because an invitation is tied to one email account.

## One-time setup

1. In Supabase Authentication, enable email authentication.
2. Configure the email sender and customise the **Invite user** email template with Hima Learning Hub wording.
3. Add the live website callback URL to Supabase's allowed redirect URLs:
   `https://YOUR-DOMAIN/auth/callback?next=/update-password`
4. Keep `SUPABASE_SERVICE_ROLE_KEY` only in the server's environment settings. Never place it in a variable beginning `NEXT_PUBLIC_`, in browser code, screenshots or emails.
5. Confirm that the public `/register` page is used only for controlled teaching-staff requests. Students must not use it.

## How Hima invites a student

1. Sign in as Hima.
2. Open **Dashboard → the student's class**.
3. Find **Authentic registration → Invite a student securely**.
4. Enter the student's full name and verified email address.
5. Select **Send secure invitation**.
6. The student receives a single-account Supabase invitation. Their profile is created as a student and assigned to that class; they cannot choose a teacher or administrator role.

## What the student does

1. Open the invitation in the same email inbox that Hima invited.
2. Follow the link to Hima Learning Hub.
3. Set a password of at least ten characters.
4. Sign in with the invited email and new password.
5. The assigned class and units appear automatically. The student does not need a public enrolment code.

## Before inviting real students

- Send one invitation to a test student email that Hima controls.
- Confirm the email arrives, the password can be set and the learner lands in the correct class.
- Complete one lesson and practical paper, then confirm the evidence appears in Hima's learner report.
- Confirm that a student cannot open another learner's report or any Hima-only page.
- Only after this test should real student invitations be sent.


import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireRole, type Role } from "@/lib/auth";

const teacherSteps = [
  ["1", "Create a group", "Choose BTEC or T Level. A group is simply the students you teach; the unit content is reused."],
  ["2", "Choose your units", "Open the group, select only the units you teach, then publish the group when it is ready."],
  ["3", "Invite students", "Send each student a secure invitation from the group page. Their account is connected to the correct group automatically."],
  ["4", "Teach and monitor", "Students complete their starting point and learning. Your dashboard then highlights progress, missed learning, outstanding work and evidence."],
];

const studentSteps = [
  ["1", "Join securely", "Open the invitation from your teacher, confirm it once and choose your password."],
  ["2", "Start from Home", "Your Home page shows the unit, teaching week, next action, feedback and any catch-up that applies to you."],
  ["3", "Complete your starting point", "This records what you know before teaching. It is a baseline, not a grade."],
  ["4", "Learn, improve and keep evidence", "Complete your lesson work, use feedback, submit improvements and review your own progress and portfolio."],
];

const administratorSteps = [
  ["1", "Give tutors access", "Open Administration, find Teacher access, choose the tutor and enter their own verified email. The tutor receives a secure password-setup link."],
  ["2", "Tutors choose their units", "Each tutor signs in, creates their BTEC or T Level group and selects only the units they teach."],
  ["3", "Tutors invite students", "The tutor publishes the group and sends secure student invitations. Joined students are connected to the correct programme, units and group automatically."],
  ["4", "Monitor the whole portal", "Use the administrator overview for curriculum, users and governance. Tutors continue to manage the learning journey for their own groups."],
];

export default async function HelpPage() {
  const actor = await requireRole("student", "teacher", "administrator");
  const isStudent = actor.role === "student";
  const isAdministrator = actor.role === "administrator";
  const steps = isStudent ? studentSteps : isAdministrator ? administratorSteps : teacherSteps;
  const heading = isStudent ? "Your learning journey, step by step" : isAdministrator ? "Set up tutors and oversee the portal" : "Your teaching workflow, step by step";
  const introduction = isStudent
    ? "The portal keeps your assigned learning, progress, feedback and evidence together. You can only see your own record."
    : isAdministrator
      ? "Create secure tutor access first. Tutors then choose their own units, invite their students and manage their teaching groups."
      : "Choose what you teach, invite your students and then use the dashboard to decide where your professional attention is needed.";

  return <>
    <AppHeader name={actor.display_name} role={actor.role}/>
    <main className="shell py-10">
      <header className="max-w-3xl">
        <p className="eyebrow">How the portal works</p>
        <h1 className="mt-3 text-4xl font-bold">{heading}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{introduction}</p>
      </header>

      <ol className="mt-9 grid gap-5 md:grid-cols-2" aria-label={`${isStudent ? "Student" : isAdministrator ? "Administrator" : "Teacher"} portal steps`}>
        {steps.map(([number, title, detail]) => <li className="card" key={number}>
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-teal-800 font-bold text-white">{number}</span>
          <h2 className="mt-4 text-xl font-bold">{title}</h2>
          <p className="mt-2 leading-7 text-slate-600">{detail}</p>
        </li>)}
      </ol>

      <section className="card mt-8 border-blue-200 bg-blue-50" aria-labelledby="privacy-help-title">
        <p className="eyebrow">Who can see what?</p>
        <h2 className="mt-2 text-2xl font-bold" id="privacy-help-title">Your view is controlled by your account role</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-700">{accessExplanation(actor.role)}</p>
      </section>

      <section className="card mt-6" aria-labelledby="help-next-title">
        <h2 className="text-2xl font-bold" id="help-next-title">What should I do now?</h2>
        <p className="mt-3 text-slate-600">{isStudent ? "Return Home and follow the first item shown under your current journey or next action." : isAdministrator ? "Open Administration and complete Teacher access for the first tutor whose status is Login needed." : "Return to the dashboard. If you are new, start with Step 1. If students have joined, begin with the Who needs me? list."}</p>
        <Link className="button mt-5" href={isAdministrator?"/admin":"/dashboard"}>{isAdministrator?"Open Administration":"Return to "+(isStudent?"Home":"dashboard")} →</Link>
      </section>
    </main>
  </>;
}

function accessExplanation(role: Role) {
  if (role === "student") return "You see only the units assigned to your group and only your own work, feedback, progress and portfolio. Student accounts cannot open teacher or administrator areas.";
  if (role === "teacher") return "You see only groups and learners for which you have teaching responsibility. Students do not see this teacher dashboard, other learners' records or administration screens.";
  return "Administrators can manage the wider portal. Teacher and student accounts remain restricted to their own responsibilities and records.";
}

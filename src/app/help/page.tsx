import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireRole, type Role } from "@/lib/auth";

const teacherSteps = [
  ["1", "Open or create a group", "Choose the programme, units and regular teaching days for the group you teach."],
  ["2", "Add students", "Create one temporary registration link on the group page and share it with that class. Close it when everyone has joined. Email invitation remains available if needed."],
  ["3", "Check progress", "The group page shows students needing help first. Open a student only when you want their full evidence."],
  ["4", "Download a report", "Download a current group report, or open one student to download a full, weekly or selected-period report."],
];

const studentSteps = [
  ["1", "Join your group", "Open the registration link shared by your teacher, check that the correct group is shown and create your student account. A secure email invitation may also be used."],
  ["2", "Start from Home", "Your Home page shows the unit, teaching week, next action, feedback and any catch-up that applies to you."],
  ["3", "Complete your starting point", "This records what you know before teaching. It is a baseline, not a grade."],
  ["4", "Learn, practise, test and improve", "Finish the current teaching week in order. Future weeks stay hidden, and mistakes lead to feedback and targeted practice before the week is complete."],
];

const administratorSteps = [
  ["1", "Prepare access", "Create groups centrally when useful, or let each tutor create a group and choose its approved programme, units and teaching days."],
  ["2", "Give tutors access", "Open Administration and send each tutor their own secure password-setup link."],
  ["3", "Tutors add students", "Tutors open their groups and share a temporary registration link. They close it after registration. Thresholds, rewards and learning automation remain centrally controlled."],
  ["4", "Use advanced setup only when needed", "Curriculum, calendar, privacy and recognition controls stay collapsed on the administrator page."],
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
      ? "Prepare groups and secure tutor access once. Tutors then add students, check progress and download reports from a short everyday workflow."
      : "Create or open your group, choose what you teach and share its temporary registration link. The portal handles weekly learning, feedback evidence and progress reporting automatically.";

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

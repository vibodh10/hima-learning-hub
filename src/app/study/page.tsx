import {practiceReminders} from "@/lib/practice-reminder-server";
import {PracticeReminderSurface} from "@/components/practice-reminder-surface";
import {studyContext} from "@/lib/mini-study-server";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { getStudyHome, type StudyHome } from "@/lib/mini-study-server";
import { MiniStudyHome } from "@/components/mini-study-player";
import {assignedCurriculumUnitCodes} from "@/lib/curriculum-access";

export default async function StudyPage() {
  const actor=await requireRole("student");
  const assignedUnits=await assignedCurriculumUnitCodes();
  const showAssignment=assignedUnits.includes("6");
  let home:StudyHome;
  try{home=await getStudyHome(actor.id);}
  catch{home={status:"unavailable",message:"Your learning step could not be loaded. Please try again in a moment."};}
  let due=false;let reminderError=false;
  try{const context=await studyContext(actor.id);if(context&&home.status!=="complete")due=(await practiceReminders(context.classId)).some(r=>r.learnerId===actor.id);}catch{reminderError=true;}
  return <PracticeReminderSurface due={due}>
    <a className="mini-study-skip" href="#study-main">Skip to your step</a>
    <header className="mini-study-header"><Link href="/study">SCCB Learning</Link><form action={logout}><button type="submit">Sign out</button></form></header>
    <main id="study-main" className="mini-study-main">{reminderError&&<p role="status">Practice reminder status could not be checked. Your learning is still available below.</p>}<MiniStudyHome initial={home}/></main>
    <footer className="mini-study-footer"><Link href="/rewards">My rewards · points, badges and themes</Link>{showAssignment&&<Link href="/study/assignment-one">Unit 6 Assignment 1 · 28 September</Link>}{assignedUnits.includes("4")&&<Link href="/study/programming-assignment-one">Unit 4 Assignment 1 · 28 September</Link>}{assignedUnits.includes("14")&&<Link href="/study/unit14-exam">Unit 14 · January exam preparation</Link>}<Link href="/help">Need help?</Link></footer>
  </PracticeReminderSurface>;
}

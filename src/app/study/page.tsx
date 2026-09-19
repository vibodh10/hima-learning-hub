import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { getStudyHome, type StudyHome } from "@/lib/mini-study-server";
import {studentSafeStudyHome} from "@/lib/mini-study-public";
import { MiniStudyHome } from "@/components/mini-study-player";
import {assignedCurriculumUnitCodes} from "@/lib/curriculum-access";
import {learnerPracticeMissesThisWeek} from "@/lib/mini-study-attendance";

export default async function StudyPage() {
  const actor=await requireRole("student");
  const assignedUnits=await assignedCurriculumUnitCodes();
  const showAssignment=assignedUnits.includes("6");
  const misses=await learnerPracticeMissesThisWeek(actor.id).catch(()=>[]);
  let home:StudyHome;
  try{home=studentSafeStudyHome(await getStudyHome(actor.id));}
  catch{home={status:"unavailable",message:"Your learning step could not be loaded. Please try again in a moment."};}
  return <div className="mini-study-surface">
    <a className="mini-study-skip" href="#study-main">Skip to your step</a>
    <header className="mini-study-header"><Link href="/study">Digital Learning Hub</Link><form action={logout}><button type="submit">Sign out</button></form></header>
    <main id="study-main" className="mini-study-main">
      {misses.length>0&&<section className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4" aria-label="Missed practice badges">
        <p className="font-semibold">Missed practice this week</p>
        <div className="mt-2 flex flex-wrap gap-2">{misses.map(miss=><span key={miss.id} className="rounded-full bg-red-700 px-3 py-1 text-sm font-bold text-white" title={miss.missed_on}>Red badge · {miss.missed_on}</span>)}</div>
        <p className="mt-2 text-sm">Each red badge records one required practice day that was not completed by the daily check. It is not a grade.</p>
        {misses.length>=3&&<p className="mt-2 font-semibold">Your tutor has been asked to review the pattern and check whether you need any support.</p>}
      </section>}
      <MiniStudyHome initial={home}/>
    </main>
    <footer className="mini-study-footer"><Link href="/rewards">My rewards · points, badges and themes</Link>{showAssignment&&<Link href="/study/assignment-one">Unit 6 Assignment 1 · 28 September</Link>}{assignedUnits.includes("4")&&<Link href="/study/programming-assignment-one">Unit 4 Assignment 1 · 28 September</Link>}{assignedUnits.includes("14")&&<Link href="/study/unit14-exam">Unit 14 · January exam preparation</Link>}<Link href="/help">Need help?</Link></footer>
  </div>;
}

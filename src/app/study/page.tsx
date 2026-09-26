import {PracticeReminderSurface} from "@/components/practice-reminder-surface";
import {createAdminClient} from "@/lib/supabase/admin";
import {studyDay} from "@/lib/mini-study";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { getStudyHome, type StudyHome } from "@/lib/mini-study-server";
import {studentSafeStudyHome} from "@/lib/mini-study-public";
import { MiniStudyHome } from "@/components/mini-study-player";
import {StudentPracticeBadges} from "@/components/student-practice-badges";
import {assignedCurriculumUnitCodes} from "@/lib/curriculum-access";
import {learnerPracticeMissesThisWeek,practiceExpectationForLearner} from "@/lib/mini-study-attendance";

export default async function StudyPage() {
  const actor=await requireRole("student");
  const assignedUnits=await assignedCurriculumUnitCodes();
  const showAssignment=assignedUnits.includes("6");
  const misses=await learnerPracticeMissesThisWeek(actor.id).catch(()=>[]);
  let home:StudyHome;
  try{home=studentSafeStudyHome(await getStudyHome(actor.id));}
  catch{home={status:"unavailable",message:"Your learning step could not be loaded. Please try again in a moment."};}
  const expectation=await practiceExpectationForLearner(actor.id).catch(()=>null);
  const latest=await createAdminClient().from("mini_study_sessions").select("completed_at").eq("learner_id",actor.id).eq("kind","daily").eq("status","completed").order("completed_at",{ascending:false}).limit(1).maybeSingle();
  const completedToday=Boolean(latest.data?.completed_at&&studyDay(new Date(latest.data.completed_at))===studyDay(new Date()));
  const due=Boolean(!latest.error&&expectation?.required&&!completedToday&&home.status!=="complete");
  return <PracticeReminderSurface due={due}>
    <a className="mini-study-skip" href="#study-main">Skip to your step</a>
    <header className="mini-study-header"><Link href="/study">Digital Learning Hub</Link><form action={logout}><button type="submit">Sign out</button></form></header>
    <main id="study-main" className="mini-study-main">
      <StudentPracticeBadges misses={misses}/>
      <MiniStudyHome initial={home}/>
    </main>
    <footer className="mini-study-footer"><Link href="/rewards">My rewards · points, badges and themes</Link>{showAssignment&&<Link href="/study/assignment-one">Unit 6 Assignment 1 · 28 September</Link>}{assignedUnits.includes("4")&&<Link href="/study/programming-assignment-one">Unit 4 Assignment 1 · 28 September</Link>}{assignedUnits.includes("2")&&<Link href="/study/unit2-exam">Unit 2 · external exam activities</Link>}{assignedUnits.includes("14")&&<Link href="/study/unit14-exam">Unit 14 · January exam preparation</Link>}<Link href="/help">Need help?</Link></footer>
  </PracticeReminderSurface>;
}

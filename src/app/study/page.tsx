import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { getStudyHome, type StudyHome } from "@/lib/mini-study-server";
import { MiniStudyHome } from "@/components/mini-study-player";

export default async function StudyPage() {
  const actor=await requireRole("student");
  let home:StudyHome;
  try{home=await getStudyHome(actor.id);}
  catch{home={status:"unavailable",message:"Your learning step could not be loaded. Please try again in a moment."};}
  return <div className="mini-study-surface">
    <a className="mini-study-skip" href="#study-main">Skip to your step</a>
    <header className="mini-study-header"><Link href="/study">SCCB Learning</Link><form action={logout}><button type="submit">Sign out</button></form></header>
    <main id="study-main" className="mini-study-main"><MiniStudyHome initial={home}/></main>
    <footer className="mini-study-footer"><Link href="/help">Need help?</Link><Link href="/privacy">Privacy</Link></footer>
  </div>;
}

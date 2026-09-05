import Link from "next/link";
import { notFound } from "next/navigation";
import { AdaptivePracticeSession } from "@/components/adaptive-practice-session";
import { topicByCode, unitByCode } from "@/lib/learning-catalog";
import { requireCurriculumTopicAccess } from "@/lib/student-week-access-server";
import { progressKeyFor } from "@/lib/learning-progress";
import { capitaliseFirst } from "@/lib/display-text";

export default async function PracticePage({params}:{params:Promise<{unitCode:string;topicCode:string}>}){
  const {unitCode,topicCode}=await params;
  const actor=await requireCurriculumTopicAccess(unitCode,topicCode);
  const unit=unitByCode(unitCode), topic=topicByCode(unitCode,topicCode);
  if(!unit||!topic)notFound();
  return <main className="shell py-10"><Link className="link text-sm" href={`/curriculum/units/${unit.code}/topics/${encodeURIComponent(topic.code)}`}>← Back to lesson</Link><header className="mt-8 mb-8"><p className="eyebrow">Practice and weekly test</p><h1 className="mt-3 text-4xl font-bold">{capitaliseFirst(topic.title)}</h1><p className="mt-3 text-slate-600">Answer one question at a time. You get immediate feedback. Hinted or incorrect answers become your targeted redo work.</p></header><AdaptivePracticeSession unit={unit} topic={topic} storageKey={progressKeyFor(actor.id)}/></main>;
}

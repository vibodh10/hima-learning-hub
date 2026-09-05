import Link from "next/link";
import { notFound } from "next/navigation";
import { AtomTopicHub } from "@/components/atom-topic-hub";
import { topicByCode, unitByCode } from "@/lib/learning-catalog";
import { requireCurriculumTopicAccess } from "@/lib/student-week-access-server";
import { loadCurriculumProgress } from "@/lib/curriculum-progress-server";
import { progressKeyFor, topicKey } from "@/lib/learning-progress";
import { capitaliseFirst } from "@/lib/display-text";

export default async function TopicPage({ params,searchParams }: { params: Promise<{ unitCode: string; topicCode: string }>;searchParams:Promise<{catchup?:string;stage?:string}> }) {
  const { unitCode, topicCode } = await params;
  const query=await searchParams;
  const catchUp=query.catchup==="1";
  const allowedStages=["before","learning","progress_check_1","progress_check_2","after"] as const;
  const evidenceStage=allowedStages.find(stage=>stage===query.stage)??"learning";
  const unit = unitByCode(unitCode);
  const topic = topicByCode(unitCode, topicCode);
  if (!unit || !topic) notFound();
  const [actor,progress]=await Promise.all([requireCurriculumTopicAccess(unitCode,topicCode),loadCurriculumProgress()]);
  const topicProgress=progress?.topics[topicKey(unit.code,topic.code)];
  return <main className="shell py-10">
    <Link className="link text-sm" href={`/curriculum/units/${unit.code}`}>← Unit {unit.code}</Link>
    <header className="mt-8 max-w-5xl"><p className="eyebrow">Unit {unit.code} · This week&apos;s topic {topic.code}</p><h1 className="mt-3 text-4xl font-bold">{capitaliseFirst(topic.title)}</h1><p className="mt-3 text-slate-600">Complete the short lesson, practice and weekly test. If a gap is found, the portal gives you only the practice you need to redo.</p></header>
    <div className="mt-8"><AtomTopicHub unit={unit} topic={topic} storageKey={progressKeyFor(actor.id)} catchUp={catchUp} evidenceStage={evidenceStage} initialEvidence={topicProgress} initialLevel={progress?.level??progress?.recommendedLevel}/></div>
  </main>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AtomTopicHub } from "@/components/atom-topic-hub";
import { topicByCode, unitByCode } from "@/lib/learning-catalog";
import { requireCurriculumUnitAccess } from "@/lib/curriculum-access";
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
  const [actor,progress]=await Promise.all([requireCurriculumUnitAccess(unitCode),loadCurriculumProgress()]);
  const moduleNumber=unit.topics.findIndex(item=>item.code===topic.code)+1;
  const topicProgress=progress?.topics[topicKey(unit.code,topic.code)];
  return <main className="shell py-10">
    <Link className="link text-sm" href={`/curriculum/units/${unit.code}`}>← Unit {unit.code}</Link>
    <header className="mt-8 max-w-5xl"><p className="eyebrow">Unit {unit.code} · Module {moduleNumber} · Pearson topic {topic.code}</p><h1 className="mt-3 text-4xl font-bold">{capitaliseFirst(topic.title)}</h1><p className="mt-4 text-lg text-slate-600">{topic.content.map(capitaliseFirst).join(" · ")}</p><p className="mt-3 text-sm text-slate-500">Work through short lesson cards, quick checks, adaptive questions and saved worksheet evidence.</p></header>
    <div className="mt-8"><AtomTopicHub unit={unit} topic={topic} storageKey={progressKeyFor(actor.id)} catchUp={catchUp} evidenceStage={evidenceStage} initialEvidence={topicProgress} initialLevel={progress?.level??progress?.recommendedLevel}/></div>
  </main>;
}

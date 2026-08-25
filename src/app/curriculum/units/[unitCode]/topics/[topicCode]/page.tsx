import Link from "next/link";
import { notFound } from "next/navigation";
import { AtomTopicHub } from "@/components/atom-topic-hub";
import { configuredUnits, topicByCode, unitByCode } from "@/lib/learning-catalog";
import { getSessionProfile } from "@/lib/auth";
import { progressKeyFor } from "@/lib/learning-progress";

export function generateStaticParams() {
  return configuredUnits.flatMap(unit => unit.topics.map(topic => ({ unitCode: unit.code, topicCode: topic.code })));
}

export default async function TopicPage({ params,searchParams }: { params: Promise<{ unitCode: string; topicCode: string }>;searchParams:Promise<{catchup?:string;stage?:string}> }) {
  const { unitCode, topicCode } = await params;
  const query=await searchParams;
  const catchUp=query.catchup==="1";
  const allowedStages=["before","learning","progress_check_1","progress_check_2","after"] as const;
  const evidenceStage=allowedStages.find(stage=>stage===query.stage)??"learning";
  const unit = unitByCode(unitCode);
  const topic = topicByCode(unitCode, topicCode);
  if (!unit || !topic) notFound();
  const actor = await getSessionProfile();
  return <main className="shell py-10">
    <Link className="link text-sm" href={`/curriculum/units/${unit.code}`}>← Unit {unit.code}</Link>
    <header className="mt-8 max-w-5xl"><p className="eyebrow">Unit {unit.code} · Topic {topic.code}</p><h1 className="mt-3 text-4xl font-bold">{topic.title}</h1><p className="mt-4 text-lg text-slate-600">{topic.content.join(" · ")}</p></header>
    <div className="mt-8"><AtomTopicHub unit={unit} topic={topic} storageKey={progressKeyFor(actor?.id ?? "guest")} catchUp={catchUp} evidenceStage={evidenceStage}/></div>
  </main>;
}

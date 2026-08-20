import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectJourney } from "@/components/learning-journey";
import { configuredUnits, metaForUnit, unitByCode } from "@/lib/learning-catalog";
import { loadCurriculumProgress } from "@/lib/curriculum-progress-server";

export function generateStaticParams() {
  return configuredUnits.map(unit => ({ unitCode: unit.code }));
}

export default async function ProjectPage({ params }: { params: Promise<{ unitCode: string }> }) {
  const { unitCode } = await params;
  const unit = unitByCode(unitCode);
  if (!unit) notFound();
  const project = metaForUnit(unit.code).project;
  const initialProgress = await loadCurriculumProgress();
  return <main className="shell py-10">
    <Link className="link text-sm" href={`/curriculum/units/${unit.code}`}>← Unit {unit.code}</Link>
    <header className="mt-8 max-w-5xl"><p className="eyebrow">Unit {unit.code} Challenge project</p><h1 className="mt-3 text-4xl font-bold">{project.title}</h1><p className="mt-4 text-lg text-slate-600">Apply the unit’s knowledge and skills in a realistic vocational scenario.</p></header>
    <div className="mt-8"><ProjectJourney unit={unit} initialProgress={initialProgress}/></div>
  </main>;
}

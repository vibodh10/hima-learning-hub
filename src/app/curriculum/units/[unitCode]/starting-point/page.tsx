import Link from "next/link";
import { notFound } from "next/navigation";
import { StartingPointAssessment } from "@/components/starting-point-assessment";
import { configuredUnits, unitByCode } from "@/lib/learning-catalog";
import { requireCurriculumUnitAccess } from "@/lib/curriculum-access";
import { progressKeyFor } from "@/lib/learning-progress";

export function generateStaticParams() { return configuredUnits.map(unit => ({ unitCode: unit.code })); }

export default async function StartingPointPage({ params }: { params: Promise<{ unitCode: string }> }) {
  const { unitCode } = await params;
  const unit = unitByCode(unitCode);
  if (!unit) notFound();
  const actor = await requireCurriculumUnitAccess(unitCode);
  return <main className="shell py-10"><Link className="link text-sm" href={`/curriculum/units/${unit.code}`}>← Unit {unit.code}</Link><header className="mt-8 max-w-4xl"><p className="eyebrow">Unit {unit.code} starting point</p><h1 className="mt-3 text-4xl font-bold">Find your best route through {unit.title}</h1><p className="mt-4 text-lg text-slate-600">This tests actual unit knowledge. Your experience and confidence are recorded separately and do not increase academic mastery.</p></header><div className="mt-8"><StartingPointAssessment unit={unit} storageKey={progressKeyFor(actor.id)}/></div></main>;
}

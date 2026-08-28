import Link from "next/link";
import { notFound } from "next/navigation";
import { UnitOverview } from "@/components/learning-journey";
import { unitByCode } from "@/lib/learning-catalog";
import { loadCurriculumProgress } from "@/lib/curriculum-progress-server";
import { requireCurriculumUnitAccess } from "@/lib/curriculum-access";
import { progressKeyFor } from "@/lib/learning-progress";

export default async function UnitPage({ params }: { params: Promise<{ unitCode: string }> }) {
  const { unitCode } = await params;
  const unit = unitByCode(unitCode);
  if (!unit) notFound();
  const [initialProgress, actor] = await Promise.all([loadCurriculumProgress(), requireCurriculumUnitAccess(unitCode)]);
  return <main className="shell py-10">
    <Link className="link text-sm" href="/curriculum">← All units</Link>
    <header className="mt-8 max-w-5xl"><p className="eyebrow">Pearson BTEC Level 3 National Information Technology</p><h1 className="mt-3 text-4xl font-bold">Unit {unit.code}: {unit.title}</h1><p className="mt-4 leading-7 text-slate-600">{unit.assessment}</p></header>
    <div className="mt-8"><UnitOverview unit={unit} initialProgress={initialProgress} storageKey={progressKeyFor(actor.id)}/></div>
  </main>;
}

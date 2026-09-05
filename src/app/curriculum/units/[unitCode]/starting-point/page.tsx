import Link from "next/link";
import { notFound } from "next/navigation";
import { StartingPointAssessment } from "@/components/starting-point-assessment";
import { unitByCode } from "@/lib/learning-catalog";
import { requireCurriculumUnitAccess } from "@/lib/curriculum-access";
import { progressKeyFor } from "@/lib/learning-progress";
import { capitaliseFirst } from "@/lib/display-text";
import { loadUnitStartingPointStatus } from "@/lib/unit-starting-point-server";

export default async function StartingPointPage({ params }: { params: Promise<{ unitCode: string }> }) {
  const { unitCode } = await params;
  const unit = unitByCode(unitCode);
  if (!unit) notFound();
  const actor = await requireCurriculumUnitAccess(unitCode);
  const status = actor.role === "student"
    ? await loadUnitStartingPointStatus(actor.id, unit.code)
    : { complete: false, completedAt: null };
  if (status.complete) return <main className="shell py-10">
    <Link className="link text-sm" href={`/curriculum/units/${unit.code}`}>← Unit {unit.code}</Link>
    <section className="card mt-8 max-w-3xl border-teal-200 bg-teal-50">
      <p className="eyebrow">Starting point recorded</p>
      <h1 className="mt-3 text-3xl font-bold">Your original baseline is protected</h1>
      <p className="mt-4 leading-7 text-slate-700">You completed the Unit {unit.code} starting point{status.completedAt?` on ${new Date(status.completedAt).toLocaleDateString("en-GB")}`:""}. It cannot be retaken or overwritten. Later checks appear as progress points so your teacher can see how you improved.</p>
      <Link className="button mt-5" href={`/curriculum/units/${unit.code}`}>Return to this week&apos;s learning →</Link>
    </section>
  </main>;
  return <main className="shell py-10"><Link className="link text-sm" href={`/curriculum/units/${unit.code}`}>← Unit {unit.code}</Link><header className="mt-8 max-w-4xl"><p className="eyebrow">Unit {unit.code} starting point</p><h1 className="mt-3 text-4xl font-bold">Find your best route through {capitaliseFirst(unit.title)}</h1><p className="mt-4 text-lg text-slate-600">This tests actual unit knowledge. Your experience and confidence are recorded separately and do not increase academic mastery.</p></header><div className="mt-8"><StartingPointAssessment unit={unit} storageKey={progressKeyFor(actor.id)}/></div></main>;
}

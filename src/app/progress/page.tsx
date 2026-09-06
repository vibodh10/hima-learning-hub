import Link from "next/link";
import { AtomProgressDashboard } from "@/components/atom-progress-dashboard";
import { configuredUnits } from "@/lib/learning-catalog";
import { loadAtomAttempts } from "@/lib/atom-attempts-server";
import { requireRole } from "@/lib/auth";
import { assignedCurriculumUnitCodes } from "@/lib/curriculum-access";
import { AppHeader } from "@/components/app-header";

export default async function ProgressPage() {
  const actor = await requireRole("student");
  const [attempts, assignedCodes] = await Promise.all([loadAtomAttempts(), assignedCurriculumUnitCodes()]);
  const assignedUnits = configuredUnits.filter(unit => assignedCodes.includes(unit.code));

  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link inline-block" href="/dashboard">← Home</Link>
    <header className="my-8 max-w-3xl"><p className="eyebrow">My progress</p><h1 className="mt-3 text-4xl font-bold">What should I practise next?</h1><p className="mt-3 text-slate-600">Your clearest next step is shown first. Open the optional section only if you want the full detail.</p></header>
    {assignedUnits.length
      ? <AtomProgressDashboard units={assignedUnits} initialAttempts={attempts}/>
      : <section className="card max-w-3xl"><h2 className="text-xl font-bold">No progress to show yet</h2><p className="mt-2 text-slate-600">Your teacher needs to assign your first unit. Starting-point and progress evidence will appear here afterwards.</p></section>}
  </main></>;
}

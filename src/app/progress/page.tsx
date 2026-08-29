import Link from "next/link";
import { AtomProgressDashboard } from "@/components/atom-progress-dashboard";
import { configuredUnits } from "@/lib/learning-catalog";
import { loadAtomAttempts } from "@/lib/atom-attempts-server";
import { requireRole } from "@/lib/auth";
import { assignedCurriculumUnitCodes } from "@/lib/curriculum-access";
import { AppHeader } from "@/components/app-header";
import { RoleBanner } from "@/components/role-banner";

export default async function ProgressPage() {
  const actor = await requireRole("student");
  const [attempts, assignedCodes] = await Promise.all([loadAtomAttempts(), assignedCurriculumUnitCodes()]);
  const assignedUnits = configuredUnits.filter(unit => assignedCodes.includes(unit.code));

  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <RoleBanner role="student"/>
    <Link className="link mt-6 inline-block" href="/dashboard">← Student dashboard</Link>
    <header className="my-8"><p className="eyebrow">My progress</p><h1 className="mt-3 text-4xl font-bold">Starting point and progress</h1><p className="mt-3 max-w-3xl text-slate-600">See your evidence only for the units assigned to your student group.</p></header>
    {assignedUnits.length
      ? <AtomProgressDashboard units={assignedUnits} initialAttempts={attempts}/>
      : <section className="card max-w-3xl"><h2 className="text-xl font-bold">No progress to show yet</h2><p className="mt-2 text-slate-600">Your teacher needs to assign your first unit. Starting-point and progress evidence will appear here afterwards.</p></section>}
  </main></>;
}

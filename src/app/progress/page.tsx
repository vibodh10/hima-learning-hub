import Link from "next/link";
import {AtomProgressDashboard} from "@/components/atom-progress-dashboard";
import {configuredUnits} from "@/lib/learning-catalog";
import {loadAtomAttempts} from "@/lib/atom-attempts-server";
import {requireRole} from "@/lib/auth";
import {progressKeyFor} from "@/lib/learning-progress";
import {AppHeader} from "@/components/app-header";
import {RoleBanner} from "@/components/role-banner";
export default async function ProgressPage(){const[attempts,actor]=await Promise.all([loadAtomAttempts(),requireRole("student")]);return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10"><RoleBanner role="student"/><Link className="link mt-6 inline-block" href="/dashboard">← Student dashboard</Link><header className="my-8"><p className="eyebrow">My progress</p><h1 className="mt-3 text-4xl font-bold">Progress and next steps</h1><p className="mt-3 max-w-3xl text-slate-600">See what is strong, where support is needed, and which topic to practise next across your course.</p></header><AtomProgressDashboard units={configuredUnits} initialAttempts={attempts} storageKey={progressKeyFor(actor.id)}/></main></>}

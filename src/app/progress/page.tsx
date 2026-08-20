import Link from "next/link";
import {AtomProgressDashboard} from "@/components/atom-progress-dashboard";
import {configuredUnits} from "@/lib/learning-catalog";
import {loadAtomAttempts} from "@/lib/atom-attempts-server";
import {getSessionProfile} from "@/lib/auth";
import {progressKeyFor} from "@/lib/learning-progress";
export default async function ProgressPage(){const[attempts,actor]=await Promise.all([loadAtomAttempts(),getSessionProfile()]);return <main className="shell py-10"><Link className="link" href="/curriculum">← Back to learning</Link><header className="my-8"><p className="eyebrow">Track</p><h1 className="mt-3 text-4xl font-bold">Your progress and next steps</h1><p className="mt-3 max-w-3xl text-slate-600">See what is strong, where support is needed, and which topic to practise next across all six BTEC units.</p></header><AtomProgressDashboard units={configuredUnits} initialAttempts={attempts} storageKey={progressKeyFor(actor?.id??"guest")}/></main>}

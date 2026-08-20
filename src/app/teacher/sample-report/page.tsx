import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth";

type Stage = "in-progress" | "completed";

const samples = {
  "in-progress": {
    label: "While the learner is working through the path",
    overall: "58%",
    completed: "4 of 8 topics",
    status: "Developing",
    strengths: ["Identifies primary and foreign keys", "Creates simple selection queries", "Uses presence and range validation"],
    needs: ["Show every step from UNF to 3NF", "Use GROUP BY correctly in summary queries", "Retest forms after correcting validation rules"],
    next: "Complete A3 Normalisation practical practice, then retry the no-hint 3NF check.",
    history: [
      ["Relational database structures", "78%", "1 hint", "Secure with support"],
      ["Normalisation", "42%", "3 hints", "Support required"],
      ["Queries", "61%", "1 hint", "Developing"],
      ["Forms and validation", "55%", "2 hints", "Developing"],
    ],
  },
  completed: {
    label: "After the learner completes the path",
    overall: "84%",
    completed: "8 of 8 topics",
    status: "Independently secure",
    strengths: ["Normalises raw data accurately to 3NF", "Builds parameter and aggregate queries", "Designs usable forms, reports and validation", "Uses precise test evidence and retesting"],
    needs: ["Refine evaluation by prioritising improvements", "Complete the scheduled retention check in two weeks"],
    next: "Attempt a fresh 66-mark Unit 2 set-task rehearsal under timed conditions.",
    history: [
      ["Relational database structures", "88%", "0 hints", "Secure"],
      ["Normalisation", "82%", "0 hints", "Secure"],
      ["Queries", "86%", "0 hints", "Secure"],
      ["Forms and validation", "81%", "0 hints", "Secure"],
      ["Set-task rehearsal", "55/66", "0 hints", "Ready for timed practice"],
    ],
  },
} as const;

export default async function SampleReportPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const actor = await requireRole("teacher", "administrator");
  const requested = (await searchParams).stage;
  const stage: Stage = requested === "completed" ? "completed" : "in-progress";
  const sample = samples[stage];
  return <><AppHeader name={actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link" href="/dashboard">← Teaching dashboard</Link>
    <header className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Sample learner report</p><h1 className="mt-2 text-4xl font-bold">What teachers see during and after a path</h1><p className="mt-3 max-w-3xl text-slate-600">This fictional Unit 2 example shows the same evidence sections used by a real learner report. It does not change any learner data.</p></div><span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-900">Preview only</span></header>
    <nav className="mt-7 flex flex-wrap gap-3" aria-label="Sample report stage"><Link className={stage === "in-progress" ? "button" : "button-secondary"} href="/teacher/sample-report?stage=in-progress">In-progress learner</Link><Link className={stage === "completed" ? "button" : "button-secondary"} href="/teacher/sample-report?stage=completed">Completed path</Link></nav>
    <section className="card mt-7"><p className="eyebrow">{sample.label}</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Fact label="Overall practical evidence" value={sample.overall}/><Fact label="Topics completed" value={sample.completed}/><Fact label="Current judgement" value={sample.status}/><Fact label="Teacher" value="Sample teacher"/></div></section>
    <section className="mt-6 grid gap-6 lg:grid-cols-2"><div className="card"><p className="eyebrow">Strengths</p><h2 className="mt-2 text-2xl font-bold">What the learner can now do</h2><ul className="mt-5 grid gap-3">{sample.strengths.map(item => <li className="rounded-xl bg-emerald-50 p-4 text-emerald-950" key={item}>✓ {item}</li>)}</ul></div><div className="card"><p className="eyebrow">Learning needs</p><h2 className="mt-2 text-2xl font-bold">What still needs attention</h2><ul className="mt-5 grid gap-3">{sample.needs.map(item => <li className="rounded-xl bg-amber-50 p-4 text-amber-950" key={item}>→ {item}</li>)}</ul></div></section>
    <section className="card mt-6"><p className="eyebrow">Evidence history</p><h2 className="mt-2 text-2xl font-bold">Topic and paper performance</h2><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="pb-3 pr-4">Activity</th><th className="pb-3 pr-4">Result</th><th className="pb-3 pr-4">Support</th><th className="pb-3">Teacher judgement</th></tr></thead><tbody>{sample.history.map(row => <tr className="border-t border-slate-200" key={row[0]}>{row.map((value, index) => <td className="py-4 pr-4" key={value}>{index === 0 ? <strong>{value}</strong> : value}</td>)}</tr>)}</tbody></table></div></section>
    <section className="card mt-6 border-blue-200 bg-blue-50"><p className="eyebrow">Recommended next step</p><h2 className="mt-2 text-2xl font-bold">{sample.next}</h2><p className="mt-3 text-sm text-blue-950">The recommendation changes as accuracy, independence, hints, practical evidence and retention evidence change.</p></section>
  </main></>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>;
}

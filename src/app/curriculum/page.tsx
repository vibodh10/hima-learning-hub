import Link from "next/link";
import { configuredUnits, metaForUnit } from "@/lib/learning-catalog";
import { CourseWorkbookProgress } from "@/components/learning-journey";
import { loadCurriculumProgress } from "@/lib/curriculum-progress-server";
import { getSessionProfile } from "@/lib/auth";
import { progressKeyFor } from "@/lib/learning-progress";

export default async function CurriculumPage() {
  const [progress, actor] = await Promise.all([loadCurriculumProgress(), getSessionProfile()]);
  return <main className="shell py-10">
    <Link className="link text-sm" href="/dashboard">← Back to dashboard</Link>
    <p className="eyebrow mt-8">Pearson BTEC Level 3 National Information Technology</p>
    <h1 className="mt-3 max-w-4xl text-4xl font-bold">Your units and topics</h1>
    <p className="mt-4 max-w-4xl leading-7 text-slate-600">Open a unit, choose a topic and learn it through explanation, worked examples, guided practice, independent practice and mastery. Each unit ends with a vocational Challenge project.</p>
    <aside className="mt-5 max-w-4xl rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><strong>Specification basis:</strong> audited against the Pearson BTEC Level 3 National Extended Diploma in Information Technology (2016/2017 specification, Issue 6, April 2021) for Units 1, 2, 4, 6, 8 and 9. Centres should still confirm the learner’s registered qualification size and current Pearson assessment arrangements.</aside>
    <CourseWorkbookProgress units={configuredUnits} initialProgress={progress} storageKey={progressKeyFor(actor?.id ?? "guest")}/>
    <section className="mt-8 grid gap-5 md:grid-cols-2">{configuredUnits.map(unit => {
      const meta = metaForUnit(unit.code);
      return <Link className="card group hover:border-teal-400 hover:bg-teal-50" href={`/curriculum/units/${unit.code}`} key={unit.code}>
        <p className="eyebrow">Unit {unit.code}</p>
        <h2 className="mt-2 text-2xl font-bold group-hover:text-teal-800">{unit.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{unit.assessment}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-slate-100 px-3 py-2">{meta.aims.length} learning aims</span><span className="rounded-full bg-slate-100 px-3 py-2">{unit.topics.length} topic lessons</span><span className="rounded-full bg-violet-100 px-3 py-2">1 Challenge project</span></div>
        <p className="mt-5 font-semibold text-teal-800">Open Unit {unit.code} →</p>
      </Link>;
    })}</section>
  </main>;
}

import Link from "next/link";
import { configuredUnits, metaForUnit } from "@/lib/learning-catalog";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { capitaliseFirst } from "@/lib/display-text";

type AssignedUnit = {
  id: string;
  code: string;
  title: string;
  kind: string;
  programme: string;
};

export default async function CurriculumPage() {
  const actor = await requireRole("student", "teacher", "administrator");
  const assignedUnits = actor.role === "student" ? await loadAssignedUnits(actor.id) : [];

  return <main className="shell py-10">
    <Link className="link text-sm" href="/dashboard">← Back to dashboard</Link>
    <p className="eyebrow mt-8">{actor.role === "student" ? "My units" : "Course content preview"}</p>
    <h1 className="mt-3 max-w-4xl text-4xl font-bold">{actor.role === "student" ? "Your assigned learning" : "Units and learner activities"}</h1>
    <p className="mt-4 max-w-4xl leading-7 text-slate-600">{actor.role === "student"
      ? "Only the units assigned to your group are shown here. Open your unit to see the starting point or the one week you need to complete now. Future weeks stay hidden."
      : "Preview the approved explanations, practice and assessment activities available to students. Students only see units assigned to their own group."}</p>

    {actor.role === "student" ? <StudentUnitList units={assignedUnits}/> : <TeacherPreviewList/>}
  </main>;
}

function StudentUnitList({ units }: { units: AssignedUnit[] }) {
  const configuredByCode = new Map(configuredUnits.map(unit => [unit.code, unit]));
  if (!units.length) return <section className="card mt-8 max-w-3xl border-blue-200 bg-blue-50"><h2 className="text-2xl font-bold">No units assigned yet</h2><p className="mt-3 text-slate-700">Your account is ready. Your teacher needs to choose your programme and units before learning begins.</p></section>;
  const [first,...rest]=units;
  return <section className="mt-8 max-w-4xl" aria-labelledby="assigned-units-title">
    <p className="eyebrow">Set by your teachers</p><h2 className="mt-2 text-2xl font-bold" id="assigned-units-title">Your assigned units</h2>
    <div className="mt-5"><StudentUnitCard unit={first} configured={configuredByCode.get(first.code)} primary/></div>
    {rest.length>0&&<details className="card mt-5"><summary className="cursor-pointer text-lg font-bold">Show my other {rest.length} unit{rest.length===1?"":"s"}</summary><div className="mt-5 grid gap-4">{rest.map(unit=><StudentUnitCard unit={unit} configured={configuredByCode.get(unit.code)} key={unit.id}/>)}</div></details>}
  </section>;
}

function StudentUnitCard({unit,configured,primary=false}:{unit:AssignedUnit;configured:(typeof configuredUnits)[number]|undefined;primary?:boolean}){
  const content=<><p className="eyebrow">{primary?"Assigned by your teacher":capitaliseFirst(unit.programme)}</p><h3 className="mt-2 text-2xl font-bold">{unit.code.match(/^\d+$/)?`Unit ${unit.code}: `:""}{capitaliseFirst(unit.title)}</h3>{configured?<><p className="mt-3 text-sm leading-6 text-slate-600">{configured.assessment}</p><p className="mt-5 font-semibold text-teal-800">Open this unit →</p></>:<p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">Your place in this unit is confirmed. Learning materials will appear after the official content has been approved by your tutor.</p>}</>;
  return configured?<Link className={`card block hover:border-teal-400 hover:bg-teal-50 ${primary?"border-teal-200 bg-teal-50":""}`} href={`/curriculum/units/${unit.code}`}>{content}</Link>:<article className="card">{content}</article>;
}

function TeacherPreviewList() {
  return <section className="mt-8 grid gap-5 md:grid-cols-2">{configuredUnits.map(unit => {
    const meta = metaForUnit(unit.code);
    return <Link className="card group hover:border-teal-400 hover:bg-teal-50" href={`/curriculum/units/${unit.code}`} key={unit.code}>
      <p className="eyebrow">BTEC · Unit {unit.code}</p>
      <h2 className="mt-2 text-2xl font-bold group-hover:text-teal-800">{capitaliseFirst(unit.title)}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{unit.assessment}</p>
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-slate-100 px-3 py-2">{meta.aims.length} learning aims</span><span className="rounded-full bg-slate-100 px-3 py-2">{unit.topics.length} weekly topics</span></div>
      <p className="mt-5 font-semibold text-teal-800">Preview Unit {unit.code} →</p>
    </Link>;
  })}</section>;
}

async function loadAssignedUnits(studentId: string): Promise<AssignedUnit[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("enrolments")
    .select("classes(published,archived_at,courses(title),class_units(active,archived_at,units(id,code,title,kind)))")
    .eq("student_id", studentId)
    .is("archived_at", null);

  const units = new Map<string, AssignedUnit>();
  for (const enrolment of data ?? []) {
    const classRecord = related(enrolment.classes);
    if (!classRecord?.published || classRecord.archived_at) continue;
    const programme = related(classRecord?.courses)?.title ?? "Your programme";
    for (const assignment of classRecord?.class_units ?? []) {
      if (!assignment.active || assignment.archived_at) continue;
      const unit = related(assignment.units);
      if (unit) units.set(unit.id, { ...unit, programme });
    }
  }
  return [...units.values()];
}

function related<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

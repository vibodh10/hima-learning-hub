import Link from "next/link";
import type {
  ClassCurriculumOverviewRow,
  CurriculumOverviewCell,
} from "@/lib/class-curriculum-overview";
import { capitaliseFirst } from "@/lib/display-text";

export function ClassCurriculumOverviewTable({
  classId,unit,rows,
}: {
  classId:string;
  unit:{code:string;title:string};
  rows:ClassCurriculumOverviewRow[];
}) {
  return <section className="card mt-8 overflow-x-auto p-0" aria-labelledby="curriculum-overview-title">
    <div className="p-5">
      <p className="eyebrow">Class curriculum</p>
      <h2 className="mt-2 text-2xl font-bold" id="curriculum-overview-title">Unit {unit.code}: {capitaliseFirst(unit.title)}</h2>
      <p className="mt-2 max-w-4xl text-sm text-slate-600">Learners are rows and the teaching decisions requested in the class overview are columns. Every cell uses stored class or active-unit evidence; selecting a cell opens that learner&apos;s evidence record.</p>
    </div>
    <table className="w-full min-w-[1480px] text-left">
      <thead className="bg-slate-50 text-sm text-slate-600"><tr>
        <th className="p-4">Student</th><th className="p-4">Starting Point</th>
        <th className="p-4">Unit Progress</th><th className="p-4">Current Module</th>
        <th className="p-4">Assessment</th><th className="p-4">Targets</th>
        <th className="p-4">Attention</th>
      </tr></thead>
      <tbody>{rows.map(row=>{
        const learnerHref=`/teacher/learners/${row.learnerId}?classId=${classId}`;
        const evidenceHref=`/teacher/learners/${row.learnerId}/evidence?classId=${classId}`;
        return <tr className="border-t border-slate-200 align-top" key={row.learnerId}>
          <td className="p-4"><Link className="link font-bold" href={learnerHref}>{row.learnerName}</Link><p className="mt-2 text-xs text-slate-500">Open learner record</p></td>
          <CurriculumCellView cell={row.startingPoint} href={evidenceHref}/>
          <CurriculumCellView cell={row.unitProgress} href={evidenceHref}/>
          <CurriculumCellView cell={row.currentModule} href={evidenceHref}/>
          <CurriculumCellView cell={row.assessment} href={evidenceHref}/>
          <CurriculumCellView cell={row.targets} href={learnerHref}/>
          <CurriculumCellView cell={row.attention} href={evidenceHref}/>
        </tr>;
      })}</tbody>
    </table>
  </section>;
}

function CurriculumCellView({cell,href}:{cell:CurriculumOverviewCell;href:string}) {
  const tone:Record<CurriculumOverviewCell["tone"],string>={
    neutral:"bg-slate-100 text-slate-800",info:"bg-blue-100 text-blue-900",
    positive:"bg-emerald-100 text-emerald-900",warning:"bg-amber-100 text-amber-950",
    danger:"bg-red-100 text-red-900",
  };
  return <td className="p-4"><Link className="block min-w-44 rounded-xl p-3 hover:ring-2 hover:ring-teal-500" href={href}><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone[cell.tone]}`}>{cell.status}</span><p className="mt-2 text-xs leading-5 text-slate-600">{cell.detail}</p></Link></td>;
}

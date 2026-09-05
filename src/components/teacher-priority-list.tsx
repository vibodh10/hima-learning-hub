import Link from "next/link";

export type TeacherPriorityItem = {
  classId: string;
  className: string;
  learnerId: string;
  learnerName: string;
  status: string;
  reason: string;
};

const statusStyles: Record<string, { label: string; colour: string }> = {
  intervention_required: { label: "Intervention required", colour: "bg-red-100 text-red-900" },
  action_required: { label: "Action required", colour: "bg-orange-100 text-orange-950" },
  catch_up_required: { label: "Catch-up required", colour: "bg-amber-100 text-amber-950" },
};

export function TeacherPriorityList({ items }: { items: TeacherPriorityItem[] }) {
  const priorities = items.filter(item => statusStyles[item.status]).slice(0, 5);

  return <section className="card mt-6" aria-labelledby="teacher-priorities-title">
    <p className="eyebrow">Student progress</p>
    <h2 className="mt-2 text-2xl font-bold" id="teacher-priorities-title">Students who need help</h2>
    <p className="mt-2 text-sm text-slate-600">Only recorded learning, catch-up and intervention evidence is used.</p>
    {priorities.length ? <div className="mt-5 grid gap-3">
      {priorities.map(item => {
        const status = statusStyles[item.status];
        return <Link
          className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 hover:bg-teal-50"
          href={`/teacher/learners/${item.learnerId}?classId=${item.classId}`}
          key={`${item.classId}:${item.learnerId}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-bold">{item.learnerName}</h3><p className="mt-1 text-sm text-slate-600">{item.className}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.colour}`}>{status.label}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">{item.reason}</p>
        </Link>;
      })}
    </div> : <p className="mt-5 rounded-xl bg-teal-50 p-4 text-sm text-teal-950">No student currently has recorded evidence requiring teacher action.</p>}
  </section>;
}

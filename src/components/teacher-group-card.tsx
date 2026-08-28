import Link from "next/link";

export function TeacherGroupCard({
  id,
  name,
  studentCount,
  schedule,
  unitTitles,
  invitationReady,
}: {
  id: string;
  name: string;
  studentCount: number;
  schedule: string;
  unitTitles: string[];
  invitationReady: boolean;
}) {
  return <Link
    href={`/teacher/classes/${id}`}
    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-5 hover:bg-teal-50"
  >
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold">{name}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
          invitationReady ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-950"
        }`}>
          {invitationReady ? "Ready to invite" : "Setup in progress"}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {studentCount} student{studentCount === 1 ? "" : "s"}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {schedule} · {unitTitles.join(", ") || "Unit setup in progress"}
      </p>
      {!invitationReady && <p className="mt-2 text-xs font-semibold text-amber-900">
        Students cannot be invited until an administrator completes this group.
      </p>}
    </div>
    <span className="font-bold text-teal-700">Open group →</span>
  </Link>;
}

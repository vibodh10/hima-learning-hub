export function StudentEnrolmentSummary({
  groupName,
  courseTitle,
}: {
  groupName: string;
  courseTitle: string;
}) {
  return <section className="card mt-6 border-blue-200 bg-blue-50" aria-label="Current enrolment">
    <p className="eyebrow">Group confirmed</p>
    <h2 className="mt-2 text-2xl font-bold">You are enrolled in {groupName}</h2>
    <p className="mt-2 text-slate-700">{courseTitle}. Your starting point or next required learning step is shown directly below.</p>
  </section>;
}

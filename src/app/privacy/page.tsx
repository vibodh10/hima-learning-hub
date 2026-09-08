import Link from "next/link";
export default function PrivacyPage() {
  return <main className="shell max-w-3xl py-16"><Link className="link" href="/">← Home</Link><p className="eyebrow mt-10">Privacy information</p><h1 className="mt-3 text-4xl font-bold">How SCCB Digital Learning Hub handles learner data</h1>
    <div className="mt-8 grid gap-6 leading-7 text-slate-700">
      <p>SCCB Digital Learning Hub records the minimum information needed to provide learning practice, show progress and help authorised teachers plan support. It does not use learner data for advertising, sell it, or use student work to train external models.</p>
      <h2 className="text-2xl font-bold text-slate-950">Who can see records</h2><p>Learners see their assigned step and feedback. Detailed progress records are shown to teachers authorised to teach their class, and to organisation administrators for service administration, retention, export and authorised deletion. A learner can ask the college for access to their information.</p>
      <h2 className="text-2xl font-bold text-slate-950">Short self-study records</h2><p>Signing in and reporting progress require an account identifier and a link to the teacher’s group. The short checks record selected answers, feedback, completion dates, targets and rewards. They do not ask for personal background, diagnoses, contact details or assignment uploads. Existing learning records are retained; the simpler student screen does not delete them.</p>
      <h2 className="text-2xl font-bold text-slate-950">What is outside SCCB Digital Learning Hub</h2><p>Formal BTEC and T Level assignments are not submitted, marked, graded or stored here. SCCB Digital Learning Hub records only classroom learning, homework, revision, skills practice and progress evidence.</p>
      <p>This is the product’s basic privacy notice. Before production use, the deploying college must add its legal identity, lawful basis, retention periods, data protection contact and complaint route.</p>
    </div></main>;
}

import Link from "next/link";
export default function PrivacyPage() {
  return <main className="shell max-w-3xl py-16"><Link className="link" href="/">← Home</Link><p className="eyebrow mt-10">Privacy information</p><h1 className="mt-3 text-4xl font-bold">How Hima handles learner data</h1>
    <div className="mt-8 grid gap-6 leading-7 text-slate-700">
      <p>Hima records the minimum information needed to provide learning practice, show progress and help authorised teachers plan support. It does not use learner data for advertising, sell it, or use student work to train external models.</p>
      <h2 className="text-2xl font-bold text-slate-950">Who can see records</h2><p>Learners can see their own records. Teachers can see learners in classes they are authorised to teach. Organisation administrators have controlled access for service administration, retention, export and authorised deletion.</p>
      <h2 className="text-2xl font-bold text-slate-950">What is outside Hima</h2><p>Formal BTEC and T Level assignments are not submitted, marked, graded or stored here. Hima records only classroom learning, homework, revision, skills practice and progress evidence.</p>
      <p>This is the product’s basic privacy notice. Before production use, the deploying college must add its legal identity, lawful basis, retention periods, data protection contact and complaint route.</p>
    </div></main>;
}

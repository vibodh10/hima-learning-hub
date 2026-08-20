import Link from "next/link";
import { Mark } from "@/components/icons";

const features = [
  ["01", "Know the starting point", "Topic-level diagnostics show what learners already know and where practice should begin."],
  ["02", "Practise with purpose", "Short lessons, worked examples and immediate feedback make every attempt useful."],
  ["03", "See the learning journey", "Teachers can follow factual evidence from starting point through practice, review and next target."],
];

export default function Home() {
  return <main className="overflow-x-hidden">
    <nav className="shell flex items-center justify-between py-6" aria-label="Main navigation">
      <Link href="/" className="flex min-h-11 items-center gap-3 font-bold text-slate-950"><Mark>S</Mark><span className="sm:hidden">SCCB Hub</span><span className="hidden sm:inline">SCCB <span className="text-teal-700">Digital Learning Hub</span></span></Link>
      <div className="flex items-center gap-3"><Link href="/privacy" className="nav-link inline-flex min-h-11 items-center">Privacy</Link><Link href="/login" className="button button-small">Sign in</Link></div>
    </nav>
    <section className="shell grid min-h-[72vh] items-center gap-12 py-16 lg:grid-cols-[1.15fr_.85fr]">
      <div>
        <p className="eyebrow">Level 3 Computing & Digital</p>
        <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-[1.04] tracking-[-.04em] text-slate-950 sm:text-7xl">Every learner’s next step, made <span className="text-teal-700">clear.</span></h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">Calm, focused learning practice for classwork, homework and revision, with progress grounded in each learner’s starting point.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/login?role=student" className="button">Student sign in <span aria-hidden>→</span></Link><Link href="/login?role=teacher" className="button-secondary">Teacher sign in</Link></div>
        <p className="mt-5 text-sm text-slate-500">Practice and progress only. Formal qualification assignments stay outside SCCB Digital Learning Hub.</p>
      </div>
      <div className="relative">
        <div className="absolute -inset-5 -rotate-3 rounded-[2rem] bg-amber-100" aria-hidden />
        <div className="card relative overflow-hidden p-0">
          <div className="border-b border-slate-100 p-6"><p className="text-sm text-slate-500">This week</p><h2 className="mt-1 text-xl font-bold">Network security fundamentals</h2></div>
          <div className="grid gap-4 p-6">
            <div className="rounded-2xl bg-teal-50 p-5"><div className="flex items-center justify-between"><span className="font-semibold">Topic progress</span><strong className="text-2xl text-teal-800">72%</strong></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white"><div className="h-full w-[72%] rounded-full bg-teal-600" /></div></div>
            {["Remember · 5 min","Learn & worked example · 12 min","Core practice · 10 min"].map((item,index)=><div key={item} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4"><span className={`grid size-9 place-items-center rounded-full font-bold ${index===2?"bg-amber-100 text-amber-900":"bg-teal-700 text-white"}`}>{index===2?"→":"✓"}</span><span className="font-medium">{item}</span></div>)}
          </div>
        </div>
      </div>
    </section>
    <section className="bg-slate-950 py-20 text-white"><div className="shell"><p className="eyebrow text-teal-300">Designed around good teaching</p><h2 className="mt-4 max-w-2xl text-3xl font-bold sm:text-4xl">A quiet system for purposeful practice.</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{features.map(([n,t,d])=><article key={n} className="border-t border-slate-700 pt-6"><span className="text-sm font-bold text-teal-300">{n}</span><h3 className="mt-4 text-xl font-semibold">{t}</h3><p className="mt-3 leading-7 text-slate-300">{d}</p></article>)}</div></div></section>
  </main>;
}

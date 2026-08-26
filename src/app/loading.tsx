export default function Loading() {
  return <main className="shell py-10" aria-live="polite" aria-busy="true">
    <p className="eyebrow">SCCB Digital Learning Hub</p>
    <h1 className="mt-3 text-3xl font-bold">Loading your learning portal…</h1>
    <p className="mt-3 text-slate-600">Your units, progress and next actions are being prepared.</p>
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map(item => <div className="card min-h-32 animate-pulse bg-slate-100" key={item}/>) }
    </div>
    <div className="card mt-6 min-h-64 animate-pulse bg-slate-100" aria-hidden="true"/>
  </main>;
}

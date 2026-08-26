import Link from "next/link";

export default function NotFound() {
  return <main className="shell grid min-h-[70vh] place-items-center py-12">
    <section className="card max-w-2xl text-center">
      <p className="eyebrow">Page not found</p>
      <h1 className="mt-3 text-3xl font-bold">That page is not available</h1>
      <p className="mt-4 leading-7 text-slate-600">The link may be out of date, or this account may not have access to that area.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link className="button" href="/dashboard">Go to my dashboard</Link>
        <Link className="button-secondary" href="/">Portal home</Link>
      </div>
    </section>
  </main>;
}

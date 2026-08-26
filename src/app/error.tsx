"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return <main className="shell grid min-h-[70vh] place-items-center py-12">
    <section className="card max-w-2xl border-amber-200 text-center" role="alert">
      <p className="eyebrow">Temporary problem</p>
      <h1 className="mt-3 text-3xl font-bold">This page could not be loaded</h1>
      <p className="mt-4 leading-7 text-slate-600">Your work has not been removed. Try loading the page again, or return to your dashboard.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button className="button" onClick={() => retry()}>Try again</button>
        <Link className="button-secondary" href="/dashboard">Return to dashboard</Link>
      </div>
      {error.digest&&<p className="mt-5 text-xs text-slate-500">Support reference: {error.digest}</p>}
    </section>
  </main>;
}

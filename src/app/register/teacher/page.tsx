import Link from "next/link";

export const metadata = { title: "Teacher registration | SCCB", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function TeacherRegistrationPage({ searchParams }: {
  searchParams: Promise<{ token_hash?: string; error?: string }>;
}) {
  const { token_hash: token, error } = await searchParams;
  const valid = typeof token === "string" && /^[a-zA-Z0-9_-]{20,256}$/.test(token);
  return <main className="shell grid min-h-screen place-items-center py-12">
    <section className="card w-full max-w-lg">
      <p className="eyebrow">Teacher registration</p>
      <h1 className="mt-3 text-3xl font-bold">Set up your teacher access</h1>
      {error === "expired" && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-950">This link has expired or has already been used. Ask your administrator to create a fresh registration link, then open only that new link.</p>}
      {valid ? <>
        <p className="mt-4 leading-7 text-slate-600">Continue, choose your password, and start using the portal. You do not need to receive or confirm an email.</p>
        <form action="/auth/verify" method="post" className="mt-6">
          <input type="hidden" name="tokenHash" value={token}/>
          <input type="hidden" name="type" value="recovery"/>
          <input type="hidden" name="flow" value="teacher"/>
          <input type="hidden" name="next" value="/update-password"/>
          <button className="button w-full">Continue to choose your password</button>
        </form>
        <p className="mt-4 text-sm text-slate-600">This private link works once. If it has expired, ask your administrator for a new teacher registration link.</p>
      </> : <>
        <p className="mt-4 leading-7 text-slate-600">Ask your administrator for your personal teacher registration link. Open the full link they share with you to choose your password. No email delivery is needed.</p>
        <p className="mt-4 text-sm text-slate-600">Each link belongs to one teacher, protecting access to student records. Administrators can generate it under Teacher access.</p>
        <Link href="/admin" className="button mt-6">Administrator: create a teacher link</Link>
      </>}
      <Link href="/login" className="mt-6 block underline">Already have a password? Sign in</Link>
    </section>
  </main>;
}

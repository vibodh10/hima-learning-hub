import Link from "next/link";
import { Mark } from "@/components/icons";

export default function RegisterPage() {
  return <main className="shell grid min-h-screen place-items-center py-12"><div className="w-full max-w-lg">
    <Link href="/" className="mb-10 flex items-center justify-center gap-3 font-bold"><Mark>S</Mark>SCCB Digital Learning Hub</Link>
    <section className="card text-center">
      <p className="eyebrow">Protected registration</p>
      <h1 className="mt-3 text-3xl font-bold">Student registration is controlled by your teacher</h1>
      <p className="mt-4 leading-7 text-slate-600">Use the group registration link shared by your teacher, or open a secure email invitation. Both routes create only a student account and connect it to the correct group.</p>
      <div className="mt-6 rounded-xl bg-blue-50 p-4 text-left text-sm leading-6 text-blue-950"><strong>Need access?</strong><br/>Ask your teacher for the current group registration link. A closed or expired link cannot be reused.</div>
      <Link className="button mt-6" href="/login">Return to sign in</Link>
    </section>
  </div></main>;
}

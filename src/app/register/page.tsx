import Link from "next/link";
import { Mark } from "@/components/icons";

export default function RegisterPage() {
  return <main className="shell grid min-h-screen place-items-center py-12"><div className="w-full max-w-lg">
    <Link href="/" className="mb-10 flex items-center justify-center gap-3 font-bold"><Mark>S</Mark>SCCB Digital Learning Hub</Link>
    <section className="card text-center">
      <p className="eyebrow">Protected registration</p>
      <h1 className="mt-3 text-3xl font-bold">Student accounts are invitation only</h1>
      <p className="mt-4 leading-7 text-slate-600">SCCB Digital Learning Hub sends each student a secure invitation to their verified email address. The invitation creates a student account already connected to the correct class; students cannot register themselves as a teacher or administrator.</p>
      <div className="mt-6 rounded-xl bg-blue-50 p-4 text-left text-sm leading-6 text-blue-950"><strong>Invited student?</strong><br/>Open the email from SCCB Digital Learning Hub, follow its link, set your password and then sign in.</div>
      <Link className="button mt-6" href="/login">Return to sign in</Link>
    </section>
  </div></main>;
}

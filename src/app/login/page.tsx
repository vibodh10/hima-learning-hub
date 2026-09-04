import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Mark } from "@/components/icons";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string;registration?:string }> }) {
  const { error,registration } = await searchParams;
  return <main className="shell grid min-h-screen place-items-center py-12"><div className="w-full max-w-md">
    <Link href="/" className="mb-10 flex items-center justify-center gap-3 font-bold"><Mark>S</Mark>SCCB Digital Learning Hub</Link>
    <div className="mb-7 text-center"><p className="eyebrow">Welcome back</p><h1 className="mt-3 text-3xl font-bold">Sign in</h1><p className="mt-2 text-slate-600">Use your own account. Your SCCB profile opens the correct student, teacher or administrator dashboard automatically.</p></div>
    <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><strong>One account has one role.</strong><p className="mt-1">To test both experiences, sign in with a separate teacher account and invited student account.</p></div>
    {(error === "callback" || error === "invalid-email-link" || error === "expired-email-link") && <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-bold">This email link has expired or has already been used.</p>
      <p className="mt-1">Request a fresh password-reset link below, then open only the newest email.</p>
    </div>}
    {error === "invitation-association" && <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-bold">Your email was confirmed, but the class assignment needs attention.</p>
      <p className="mt-1">Ask your teacher to retry your invitation. Your account has not been attached to an unrelated class.</p>
    </div>}
    {registration === "complete" && <div role="status" className="mb-5 rounded-xl border border-teal-300 bg-teal-50 p-4 text-sm text-teal-950">
      <p className="font-bold">Your account and group are ready.</p>
      <p className="mt-1">Sign in with the password you just created.</p>
    </div>}
    <AuthForm />
    <p className="mt-5 text-center text-sm"><Link className="link" href="/forgot-password">Forgot your password?</Link></p>
    <p className="mt-6 text-center text-sm text-slate-600">Need an account? <Link className="link" href="/register">See how registration works</Link></p>
  </div></main>;
}

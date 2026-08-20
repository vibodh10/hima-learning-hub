import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Mark } from "@/components/icons";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string; error?: string }> }) {
  const { role, error } = await searchParams;
  const showDemo = process.env.NODE_ENV !== "production";
  const presetRole = showDemo && (role === "student" || role === "teacher") ? role : undefined;
  return <main className="shell grid min-h-screen place-items-center py-12"><div className="w-full max-w-md">
    <Link href="/" className="mb-10 flex items-center justify-center gap-3 font-bold"><Mark>S</Mark>SCCB Digital Learning Hub</Link>
    <div className="mb-7 text-center"><p className="eyebrow">Welcome back</p><h1 className="mt-3 text-3xl font-bold">Sign in to your learning</h1><p className="mt-2 text-slate-600">Students and teachers use the same secure sign-in.</p></div>
    {(error === "callback" || error === "invalid-email-link" || error === "expired-email-link") && <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-bold">This email link has expired or has already been used.</p>
      <p className="mt-1">Request a fresh password-reset link below, then open only the newest email.</p>
    </div>}
    <AuthForm presetRole={presetRole} showDemo={showDemo} />
    <p className="mt-5 text-center text-sm"><Link className="link" href="/forgot-password">Forgot your password?</Link></p>
    <p className="mt-6 text-center text-sm text-slate-600">Need an account? <Link className="link" href="/register">See how invitations work</Link></p>
  </div></main>;
}

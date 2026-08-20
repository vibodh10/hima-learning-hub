import Link from "next/link";
import { PasswordForm } from "@/components/password-form";
export default function ForgotPasswordPage(){return <main className="shell grid min-h-screen place-items-center py-12"><div className="w-full max-w-md"><Link className="link" href="/login">← Sign in</Link><p className="eyebrow mt-10">Account access</p><h1 className="mt-3 text-3xl font-bold">Reset your password</h1><p className="mb-7 mt-2 text-slate-600">We will send a secure reset link if the address is registered.</p><PasswordForm mode="request"/></div></main>}

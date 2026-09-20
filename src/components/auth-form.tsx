"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { login, type AuthState } from "@/app/actions/auth";

export function AuthForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(login, {});
  const [failedAttempts,setFailedAttempts]=useState(0);
  useEffect(()=>{
    if(state.message==="The email or password was not recognised.")setFailedAttempts(value=>value+1);
  },[state]);
  const recoveryNeeded=failedAttempts>=3;
  return (
    <form action={formAction} className="card grid gap-5" aria-describedby="form-message">
      <Field label="Email address" name="email" type="email" autoComplete="email" error={state.errors?.email?.[0]} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" error={state.errors?.password?.[0]} />
      {state.message && <p id="form-message" role="status" className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{state.message}</p>}
      {recoveryNeeded&&<div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-bold">It looks like you may have forgotten your password.</p>
        <p className="mt-1">Do not keep guessing. Reset it yourself now, then sign in with your new password.</p>
        <Link className="link mt-2 inline-block font-bold" href="/forgot-password">Reset my password →</Link>
      </div>}
      <button className="button" disabled={pending}>{pending ? "Please wait…" : "Sign in"}</button>
    </form>
  );
}

function Field({ label, name, type = "text", autoComplete, error }: { label: string; name: string; type?: string; autoComplete: string; error?: string }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-800">{label}
    <input className="input" name={name} type={type} autoComplete={autoComplete} required aria-invalid={Boolean(error)} />
    {error && <span className="text-sm font-normal text-red-700">{error}</span>}
  </label>;
}

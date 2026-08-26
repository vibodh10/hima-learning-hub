"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/app/actions/auth";

export function AuthForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={formAction} className="card grid gap-5" aria-describedby="form-message">
      <Field label="Email address" name="email" type="email" autoComplete="email" error={state.errors?.email?.[0]} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" error={state.errors?.password?.[0]} />
      {state.message && <p id="form-message" role="status" className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{state.message}</p>}
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

"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/app/actions/auth";

const demoAccounts = {
  student: { email: "student.hima.ms38skyz@example.com", label: "Student demo" },
  teacher: { email: "teacher.hima.ms38skyz@example.com", label: "Teacher demo" },
} as const;

export function AuthForm({ presetRole, showDemo = false }: { presetRole?: keyof typeof demoAccounts; showDemo?: boolean }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(login, {});
  const preset = showDemo && presetRole ? demoAccounts[presetRole] : undefined;
  return (
    <form action={formAction} className="card grid gap-5" aria-describedby="form-message">
      {showDemo && <div className="rounded-xl bg-teal-50 p-4 text-sm text-teal-950">
        <p className="font-bold">Test the working model</p>
        <p className="mt-1">Choose a role, then press Sign in. These are fictional test accounts.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(demoAccounts).map(([role, account]) =>
            <a key={role} className="button-secondary button-small" href={`/login?role=${role}`}>{account.label}</a>)}
        </div>
      </div>}
      <Field label="Email address" name="email" type="email" autoComplete="email" defaultValue={preset?.email} error={state.errors?.email?.[0]} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" defaultValue={preset ? "password" : undefined} error={state.errors?.password?.[0]} />
      {state.message && <p id="form-message" role="status" className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{state.message}</p>}
      <button className="button" disabled={pending}>{pending ? "Please wait…" : "Sign in"}</button>
    </form>
  );
}

function Field({ label, name, type = "text", autoComplete, defaultValue, error }: { label: string; name: string; type?: string; autoComplete: string; defaultValue?: string; error?: string }) {
  return <label className="grid gap-2 text-sm font-semibold text-slate-800">{label}
    <input className="input" name={name} type={type} autoComplete={autoComplete} defaultValue={defaultValue} required aria-invalid={Boolean(error)} />
    {error && <span className="text-sm font-normal text-red-700">{error}</span>}
  </label>;
}

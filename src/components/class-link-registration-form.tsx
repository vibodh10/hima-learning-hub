"use client";

import { useActionState } from "react";
import {
  registerWithClassLink,
  joinClassWithExistingAccount,
  type ClassRegistrationState,
} from "@/app/actions/class-registration";

export function ClassLinkRegistrationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ClassRegistrationState, FormData>(registerWithClassLink, {});
  const [existingState, existingAction, joining] = useActionState<ClassRegistrationState, FormData>(joinClassWithExistingAccount, {});
  return <><form action={action} className="mt-6 grid gap-4">
    <input name="token" type="hidden" value={token}/>
    <Field label="Full name" name="name" autoComplete="name" error={state.errors?.name?.[0]}/>
    <Field label="Email address" name="email" type="email" autoComplete="email" error={state.errors?.email?.[0]}/>
    <Field label="Create a password" name="password" type="password" autoComplete="new-password" error={state.errors?.password?.[0]}/>
    <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" error={state.errors?.confirmPassword?.[0]}/>
    <button className="button mt-2" disabled={pending}>{pending ? "Creating your account…" : "Register and join this group"}</button>
    {state.message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{state.message}</p>}
  </form>
  <details className="mt-6 rounded-xl border border-slate-200 p-4">
    <summary className="cursor-pointer font-bold">I already have a student account</summary>
    <form action={existingAction} className="mt-4 grid gap-4">
      <input name="token" type="hidden" value={token}/>
      <Field label="Account email" name="email" type="email" autoComplete="email" error={existingState.errors?.email?.[0]}/>
      <Field label="Account password" name="password" type="password" autoComplete="current-password" error={existingState.errors?.password?.[0]}/>
      <button className="button-secondary" disabled={joining}>{joining ? "Joining group…" : "Sign in and join this group"}</button>
      {existingState.message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{existingState.message}</p>}
    </form>
  </details></>;
}

function Field({
  label,name,type="text",autoComplete,error,
}: {
  label:string;name:string;type?:string;autoComplete:string;error?:string;
}) {
  return <label className="grid gap-2 text-sm font-semibold">{label}
    <input className="input" name={name} type={type} autoComplete={autoComplete} required aria-invalid={Boolean(error)}/>
    {error && <span className="font-normal text-red-700">{error}</span>}
  </label>;
}

"use client";

import { useActionState } from "react";
import { setupTeacherAccount, type StaffAccountState } from "@/app/actions/staff-accounts";
import { requestedTeacherNames } from "@/lib/requested-teachers";

export function TeacherAccountSetupForm() {
  const [state, action, pending] = useActionState<StaffAccountState, FormData>(setupTeacherAccount, {});
  return <section className="card mt-6 border-teal-200" aria-labelledby="teacher-account-title">
    <p className="eyebrow">Secure tutor onboarding</p>
    <h2 className="mt-2 text-2xl font-bold" id="teacher-account-title">Create a teacher login</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Use only the tutor&apos;s verified college email. The portal creates no shared or visible password; the tutor receives a secure link and chooses their own password.</p>
    <form action={action} className="mt-5 grid gap-4 md:grid-cols-[1fr_1.2fr_auto] md:items-end">
      <label className="grid gap-2 text-sm font-semibold">Tutor
        <select className="input" name="name" required defaultValue="">
          <option value="" disabled>Choose a tutor</option>
          {requestedTeacherNames.map(name => <option value={name} key={name}>{name}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">Verified college email
        <input className="input" name="email" type="email" autoComplete="off" required/>
      </label>
      <button className="button" disabled={pending}>{pending ? "Creating…" : "Create login"}</button>
      {state.errors?.name?.[0]&&<p className="text-sm text-red-700">{state.errors.name[0]}</p>}
      {state.errors?.email?.[0]&&<p className="text-sm text-red-700 md:col-start-2">{state.errors.email[0]}</p>}
      {state.message&&<p role="status" className={`rounded-xl p-3 text-sm md:col-span-3 ${state.ok?"bg-teal-50 text-teal-950":"bg-amber-50 text-amber-950"}`}>{state.message}</p>}
    </form>
  </section>;
}

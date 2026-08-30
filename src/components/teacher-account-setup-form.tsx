"use client";

import { useActionState } from "react";
import { setupTeacherAccount, type StaffAccountState } from "@/app/actions/staff-accounts";
import { requestedTeacherNames } from "@/lib/requested-teachers";

type ExistingTeacherAccount={name:string;email:string|null;status?:"active"|"incomplete"};

export function TeacherAccountSetupForm({existingAccounts=[]}:{existingAccounts?:ExistingTeacherAccount[]}) {
  const [state, action, pending] = useActionState<StaffAccountState, FormData>(setupTeacherAccount, {});
  return <section className="card mt-6 border-teal-200" aria-labelledby="teacher-account-title">
    <p className="eyebrow">Secure tutor onboarding</p>
    <h2 className="mt-2 text-2xl font-bold" id="teacher-account-title">Teacher access</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Use only the tutor&apos;s verified college email. The portal creates no shared or visible password; the tutor receives a secure link and chooses their own password.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Requested teacher account status">
      {requestedTeacherNames.map(name=>{
        const account=existingAccounts.find(item=>item.name===name);
        const active=Boolean(account&&(account.status??"active")==="active");
        return <article className="rounded-xl border border-slate-200 p-4" key={name}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-bold">{name}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${active?"bg-emerald-100 text-emerald-950":"bg-amber-100 text-amber-950"}`}>{active?"Access active":account?"Login needs repair":"Login needed"}</span>
          </div>
          <p className="mt-2 break-all text-sm text-slate-600">{account?.email??(account?"A teacher profile exists, but its secure login is missing.":"Enter this tutor's verified email below.")}</p>
        </article>;
      })}
    </div>
    <h3 className="mt-7 text-lg font-bold">Create access or resend password setup</h3>
    <form action={action} className="mt-5 grid gap-4 md:grid-cols-[1fr_1.2fr_auto] md:items-end">
      <label className="grid gap-2 text-sm font-semibold">Tutor
        <select className="input" name="name" required defaultValue="">
          <option value="" disabled>Choose a tutor</option>
          {requestedTeacherNames.map(name => <option value={name} key={name}>{name}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">Verified college email
        <input className="input" name="email" type="email" inputMode="email" placeholder="name@sccb.ac.uk" autoComplete="off" required/>
      </label>
      <button className="button" disabled={pending}>{pending ? "Sending…" : "Create or resend"}</button>
      {state.errors?.name?.[0]&&<p className="text-sm text-red-700">{state.errors.name[0]}</p>}
      {state.errors?.email?.[0]&&<p className="text-sm text-red-700 md:col-start-2">{state.errors.email[0]}</p>}
      {state.message&&<p role="status" className={`rounded-xl p-3 text-sm md:col-span-3 ${state.ok?"bg-teal-50 text-teal-950":"bg-amber-50 text-amber-950"}`}>{state.message}</p>}
    </form>
  </section>;
}

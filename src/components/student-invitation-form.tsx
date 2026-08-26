"use client";

import { useActionState } from "react";
import { inviteStudent, type InvitationState } from "@/app/actions/invitations";

export function StudentInvitationForm({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState<InvitationState, FormData>(inviteStudent, {});
  return <section className="card mt-6 border-blue-200" id="invitations">
    <p className="eyebrow">2. Add your students</p>
    <h2 className="mt-2 text-2xl font-bold">Send a secure invitation</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">Enter one student’s name and college email. Their secure link automatically joins them to this group and its selected units.</p>
    <form action={action} className="mt-5 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="classId" value={classId}/>
      <Field label="Student's full name" name="name" error={state.errors?.name?.[0]}/>
      <Field label="Verified student email" name="email" type="email" error={state.errors?.email?.[0]}/>
      <button className="button justify-self-start md:col-span-2" disabled={pending}>{pending ? "Sending invitation…" : "Send secure invitation"}</button>
      {state.message && <p role="status" className={`md:col-span-2 rounded-xl p-3 text-sm ${state.ok ? "bg-teal-50 text-teal-950" : "bg-red-50 text-red-800"}`}>{state.message}</p>}
    </form>
  </section>;
}

function Field({ label, name, type = "text", error }: { label: string; name: string; type?: string; error?: string }) {
  return <label className="grid gap-2 text-sm font-semibold">{label}<input className="input" name={name} type={type} required aria-invalid={Boolean(error)}/>{error && <span className="font-normal text-red-700">{error}</span>}</label>;
}

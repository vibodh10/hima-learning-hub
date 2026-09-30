"use client";

import {useActionState} from "react";
import {setStudentPassword, type StudentPasswordState} from "@/app/actions/student-passwords";

export function StudentPasswordForm({students}: {students: {id: string; display_name: string}[]}) {
  const [state, action, pending] = useActionState<StudentPasswordState, FormData>(setStudentPassword, {});
  return <section className="card mt-6 border-sky-200" aria-labelledby="student-password-title">
    <p className="eyebrow">Administrator only · Existing student accounts</p>
    <h2 id="student-password-title" className="mt-2 text-2xl font-bold">Set a student password</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Restore access using the student&apos;s original account. Their login email, class membership and saved progress stay the same. No reset email or new registration is needed.</p>
    <form action={action} className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold">Student
        <select className="input" name="studentId" defaultValue="" required disabled={pending}>
          <option value="" disabled>Choose the existing student account</option>
          {students.map(student => <option key={student.id} value={student.id}>{student.display_name} · {student.id.slice(0,8)}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">Existing login email
        <input className="input" name="email" type="email" autoComplete="off" required disabled={pending}/>
      </label>
      <label className="grid gap-2 text-sm font-semibold">New password
        <input className="input" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required disabled={pending}/>
      </label>
      <label className="grid gap-2 text-sm font-semibold">Confirm new password
        <input className="input" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={72} required disabled={pending}/>
      </label>
      <p className="text-sm text-slate-600 sm:col-span-2">Use a different password for each student, with at least 10 characters. Give it to the named student privately. Passwords are not displayed or stored in the portal&apos;s reports or audit log.</p>
      <label className="flex items-start gap-3 text-sm sm:col-span-2"><input className="mt-1" type="checkbox" name="identityConfirmed" required disabled={pending}/>I have confirmed the student&apos;s identity and checked this is their original account.</label>
      <button className="button sm:col-span-2" disabled={pending || students.length === 0}>{pending ? "Updating password…" : "Set student password"}</button>
      {state.message && <p role="status" className={`rounded-xl p-3 text-sm sm:col-span-2 ${state.ok ? "bg-teal-50 text-teal-950" : "bg-amber-50 text-amber-950"}`}>{state.message}</p>}
    </form>
  </section>;
}

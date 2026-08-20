"use client";
import { useActionState } from "react";
import { requestPasswordReset, updatePassword, type AuthState } from "@/app/actions/auth";
export function PasswordForm({ mode }: { mode: "request" | "update" }) {
  const [state, action, pending] = useActionState<AuthState,FormData>(mode==="request"?requestPasswordReset:updatePassword,{});
  const name=mode==="request"?"email":"password";
  return <form action={action} className="card grid gap-5"><label className="grid gap-2 text-sm font-semibold">{mode==="request"?"Email address":"New password"}
    <input className="input" name={name} type={mode==="request"?"email":"password"} autoComplete={mode==="request"?"email":"new-password"} required/>
    {state.errors?.[name]?.[0]&&<span className="font-normal text-red-700">{state.errors[name][0]}</span>}
  </label>{state.message&&<p role="status" className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{state.message}</p>}
  <button className="button" disabled={pending}>{pending?"Please wait…":mode==="request"?"Send reset link":"Update password"}</button></form>;
}

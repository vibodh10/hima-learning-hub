"use client";

import { useActionState } from "react";
import {
  closeClassRegistrationLink,
  openClassRegistrationLink,
  type ClassRegistrationState,
} from "@/app/actions/class-registration";

type ActiveLink = {
  id: string;
  expiresAt: string;
  registrationCount: number;
  maxRegistrations: number;
} | null;

export function ClassRegistrationLinkPanel({
  classId,
  activeLink,
}: {
  classId: string;
  activeLink: ActiveLink;
}) {
  const [openState, openAction, opening] = useActionState<ClassRegistrationState, FormData>(openClassRegistrationLink, {});
  const [closeState, closeAction, closing] = useActionState<ClassRegistrationState, FormData>(closeClassRegistrationLink, {});
  return <section className="card mt-6 border-teal-200 bg-teal-50" id="registration-link">
    <p className="eyebrow">Add students when invitation email is blocked</p>
    <h2 className="mt-2 text-2xl font-bold">Share one group registration link</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
      Students open the link, enter their details and join this group. The link expires after seven days, and you can close it as soon as everyone has registered.
    </p>

    {activeLink && <div className="mt-5 rounded-xl border border-teal-300 bg-white p-4">
      <p className="font-bold text-teal-950">Registration is open</p>
      <p className="mt-1 text-sm text-slate-600">{activeLink.registrationCount} registered through this link. It expires {formatDateTime(activeLink.expiresAt)}.</p>
      <p className="mt-2 text-xs text-slate-500">If you no longer have the original link, create a fresh one. The old link will close automatically.</p>
    </div>}

    <div className="mt-5 flex flex-wrap gap-3">
      <form action={openAction}>
        <input name="classId" type="hidden" value={classId}/>
        <button className="button" disabled={opening}>{opening ? "Creating link…" : activeLink ? "Create a fresh link" : "Create registration link"}</button>
      </form>
      {activeLink && <form action={closeAction}>
        <input name="classId" type="hidden" value={classId}/>
        <input name="linkId" type="hidden" value={activeLink.id}/>
        <button className="button-secondary" disabled={closing}>{closing ? "Closing…" : "Close registration link"}</button>
      </form>}
    </div>

    {openState.url && <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4" role="status">
      <label className="grid gap-2 text-sm font-bold">Copy and share this link
        <textarea className="input min-h-20 resize-none bg-white font-normal" readOnly value={openState.url}/>
      </label>
      <a className="link mt-3 inline-block text-sm" href={openState.url} target="_blank" rel="noreferrer">Preview the student registration page</a>
    </div>}
    {openState.message && <p className={`mt-4 rounded-xl p-3 text-sm ${openState.ok ? "bg-white text-teal-950" : "bg-red-50 text-red-800"}`} role="status">{openState.message}</p>}
    {closeState.message && <p className={`mt-4 rounded-xl p-3 text-sm ${closeState.ok ? "bg-white text-teal-950" : "bg-red-50 text-red-800"}`} role="status">{closeState.message}</p>}
  </section>;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

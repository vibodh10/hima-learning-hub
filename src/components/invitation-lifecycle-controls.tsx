"use client";

import { useActionState } from "react";
import {
  manageStudentInvitation,
  type InvitationState,
} from "@/app/actions/invitations";

export function InvitationLifecycleControls({
  invitationId,
  classId,
  status,
}: {
  invitationId: string;
  classId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState<InvitationState, FormData>(
    manageStudentInvitation,
    {},
  );
  if (status === "accepted") return null;

  const canCancel = ["pending", "sent", "failed", "expired"].includes(status);
  const canExpire = ["pending", "sent"].includes(status);
  const canRetry = ["sent", "failed", "expired", "cancelled"].includes(status);

  return <form action={action} className="mt-4 border-t border-slate-200 pt-4">
    <input type="hidden" name="invitationId" value={invitationId}/>
    <input type="hidden" name="classId" value={classId}/>
    <div className="flex flex-wrap gap-2">
      {canRetry ? <button className="button-secondary" disabled={pending} name="operation" value="retry">
        {pending ? "Working…" : "Send another access email"}
      </button> : null}
      {canExpire ? <button className="button-secondary" disabled={pending} name="operation" value="expire">
        Mark expired
      </button> : null}
      {canCancel ? <button className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-800 hover:bg-red-50 disabled:opacity-60" disabled={pending} name="operation" value="cancel">
        Cancel invitation
      </button> : null}
    </div>
    {state.message ? <p role="status" className={`mt-3 rounded-xl p-3 text-sm ${state.ok ? "bg-teal-50 text-teal-950" : "bg-red-50 text-red-800"}`}>
      {state.message}
    </p> : null}
  </form>;
}

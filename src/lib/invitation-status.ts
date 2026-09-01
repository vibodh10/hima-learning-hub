export type InvitationStatusPresentation = {
  label: string;
  className: string;
  detail: string;
};

export function presentInvitationStatus(
  status: string,
  detailCode: string | null,
  currentlyEnrolled: boolean,
): InvitationStatusPresentation {
  if (status === "accepted") {
    if (!currentlyEnrolled) {
      return {
        label: "Joined previously",
        className: "bg-slate-100 text-slate-700",
        detail: "The invitation was accepted, but this learner is not currently active in the group.",
      };
    }
    return {
      label: "Joined",
      className: "bg-emerald-100 text-emerald-900",
      detail: "The student account is connected to this group.",
    };
  }
  if (status === "sent" && detailCode?.startsWith("association_pending:")) {
    return {
      label: "Connection pending",
      className: "bg-amber-100 text-amber-950",
      detail: "The email was sent. Class access is not confirmed until the student accepts securely.",
    };
  }
  if (status === "sent") {
    return {
      label: "Invitation sent",
      className: "bg-blue-100 text-blue-900",
      detail: "Waiting for the student to open the secure link and sign in.",
    };
  }
  if (status === "pending") {
    return {
      label: "Preparing",
      className: "bg-slate-100 text-slate-900",
      detail: "The invitation request has been recorded but delivery is not yet confirmed.",
    };
  }
  if (status === "failed") {
    return {
      label: "Needs attention",
      className: "bg-red-100 text-red-900",
      detail: failedInvitationDetail(detailCode),
    };
  }
  if (status === "expired") {
    return {
      label: "Expired",
      className: "bg-amber-100 text-amber-950",
      detail: "This link is inactive. Use “Send another access email” if the student still needs access.",
    };
  }
  return {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-700",
    detail: "This invitation is inactive. It can be retried without reusing the cancelled link.",
  };
}

function failedInvitationDetail(detailCode: string | null) {
  if (detailCode === "staff_account") return "This email belongs to a staff account and cannot be enrolled as a student.";
  if (detailCode === "different_organisation") return "This account belongs to another organisation and needs administrator review.";
  if (detailCode === "archived_account") return "This student account is archived and must be restored before enrolment.";
  if (detailCode === "delivery_failed") return "The email service did not confirm delivery. Check the address and retry.";
  if (detailCode === "profile_conflict") return "The account profile conflicts with this student invitation and needs administrator review.";
  return "The invitation could not be completed safely. Check the address, retry once, or ask an administrator to review it.";
}

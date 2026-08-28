export type TeacherNextAction = {
  kind: "attention" | "await_group" | "create_group" | "choose_units" | "publish_units" | "invite_students" | "track_invitations" | "monitor";
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
  label: string;
  meta?: string;
};

type TeacherClassSummary = {
  id: string;
  name: string;
  published: boolean;
  activeUnitCount: number;
  studentCount: number;
  pendingInvitationCount: number;
};

type TeacherAttentionCandidate = {
  learnerId: string;
  displayName: string;
  status: string;
  reason: string;
};

const attentionLabels: Record<string, string> = {
  intervention_required: "Intervention required",
  action_required: "Action required",
  catch_up_required: "Catch-up required",
};

export function selectTeacherNextAction(input: {
  classes: TeacherClassSummary[];
  attention: TeacherAttentionCandidate[];
  canManageGroupSetup?: boolean;
}): TeacherNextAction {
  const canManageGroupSetup = input.canManageGroupSetup ?? true;
  const attention = [...input.attention]
    .filter(candidate => candidate.status in attentionLabels)
    .sort((left,right)=>attentionPriority(left.status)-attentionPriority(right.status)||left.displayName.localeCompare(right.displayName))[0];
  if (attention) {
    return {
      kind: "attention",
      eyebrow: "Next teaching action",
      title: `Review ${attention.displayName}`,
      detail: attention.reason,
      href: `/teacher/learners/${attention.learnerId}`,
      label: "Open learner evidence",
      meta: attentionLabels[attention.status],
    };
  }

  if (!input.classes.length) {
    if (!canManageGroupSetup) {
      return {
        kind: "await_group",
        eyebrow: "My groups",
        title: "No group has been assigned yet",
        detail: "An administrator will add your group and units. You do not need to configure anything here.",
        href: "#groups",
        label: "View my groups",
      };
    }
    return {
      kind: "create_group",
      eyebrow: "Start here",
      title: "Create your first student group",
      detail: "Choose the programme first. You will select the units you teach inside the new group.",
      href: "#groups",
      label: "Create a group",
      meta: "Step 1 of 3",
    };
  }

  const withoutUnits = input.classes.find(item => item.activeUnitCount === 0);
  if (withoutUnits) {
    if (!canManageGroupSetup) {
      return {
        kind: "await_group",
        eyebrow: "Group preparation",
        title: `${withoutUnits.name} is being prepared`,
        detail: "An administrator is adding the correct units. No setup is required from you.",
        href: `/teacher/classes/${withoutUnits.id}`,
        label: "View group",
      };
    }
    return {
      kind: "choose_units",
      eyebrow: "Continue setup",
      title: `Choose the units for ${withoutUnits.name}`,
      detail: "Select only the units this group should study and choose the current focus unit.",
      href: `/teacher/classes/${withoutUnits.id}#unit-settings`,
      label: "Choose units",
      meta: "Step 2 of 3",
    };
  }

  const unpublished = input.classes.find(item => !item.published);
  if (unpublished) {
    if (!canManageGroupSetup) {
      return {
        kind: "await_group",
        eyebrow: "Group preparation",
        title: `${unpublished.name} is being prepared`,
        detail: "An administrator is checking the unit setup. No setup is required from you.",
        href: `/teacher/classes/${unpublished.id}`,
        label: "View group",
      };
    }
    return {
      kind: "publish_units",
      eyebrow: "Continue setup",
      title: `Make ${unpublished.name}'s units visible`,
      detail: "Review the selected units, choose the starting unit and publish them before inviting students.",
      href: `/teacher/classes/${unpublished.id}#unit-settings`,
      label: "Review and publish units",
      meta: "Step 2 of 3",
    };
  }

  const pendingInvitations = input.classes.find(item => item.studentCount === 0 && item.pendingInvitationCount > 0);
  if (pendingInvitations) {
    return {
      kind: "track_invitations",
      eyebrow: "Student onboarding",
      title: `Track invitations for ${pendingInvitations.name}`,
      detail: "Secure invitations have been sent. Check who has joined and retry only invitations that show a problem.",
      href: `/teacher/classes/${pendingInvitations.id}#invitation-status`,
      label: "View invitation status",
      meta: `${pendingInvitations.pendingInvitationCount} awaiting response`,
    };
  }

  const awaitingStudents = input.classes.find(item => item.studentCount === 0);
  if (awaitingStudents) {
    return {
      kind: "invite_students",
      eyebrow: "Continue setup",
      title: `Invite students to ${awaitingStudents.name}`,
      detail: "Send each student a secure invitation. Their course, units and learning journey will be connected automatically.",
      href: `/teacher/classes/${awaitingStudents.id}#invitations`,
      label: "Invite students",
      meta: "Step 3 of 3",
    };
  }

  const classToMonitor = [...input.classes]
    .sort((left, right) => right.studentCount - left.studentCount || left.name.localeCompare(right.name))[0];
  return {
    kind: "monitor",
    eyebrow: "Next teaching action",
    title: `Monitor ${classToMonitor.name}`,
    detail: "Review current progress, starting points, targets and evidence. Intervene only where the recorded signals show a need.",
    href: `/teacher/classes/${classToMonitor.id}`,
    label: "Open group progress",
    meta: `${classToMonitor.studentCount} learner${classToMonitor.studentCount === 1 ? "" : "s"}`,
  };
}

function attentionPriority(status:string) {
  return ({ intervention_required: 0, action_required: 1, catch_up_required: 2 } as Record<string,number>)[status] ?? 3;
}

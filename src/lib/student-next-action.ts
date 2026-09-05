export type StudentNextAction = {
  kind: "starting_point" | "catch_up" | "allocation" | "resume" | "journey" | "target" | "unit" | "lesson";
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
  label: string;
  meta?: string;
};

export function isStudentNextActionUrgent(action: StudentNextAction | null) {
  return action?.kind === "catch_up"
    || (action?.kind === "allocation" && action.meta?.startsWith("Overdue") === true);
}

type CatchUpCandidate = {
  title: string;
  href: string;
  status: string;
};

type AllocationCandidate = {
  title: string;
  href: string;
  completed: boolean;
  deadlineAt: string | null;
};

type LinkedCandidate = {
  title: string;
  detail: string;
  href: string;
};

export function selectStudentNextAction(input: {
  startingPoint?: LinkedCandidate;
  catchUps: CatchUpCandidate[];
  allocations: AllocationCandidate[];
  resume?: LinkedCandidate;
  journey?: LinkedCandidate;
  target?: LinkedCandidate;
  unit?: LinkedCandidate;
  lesson?: LinkedCandidate;
  now: number;
}): StudentNextAction | null {
  if (input.startingPoint) {
    return {
      kind: "starting_point",
      eyebrow: "Begin here",
      title: input.startingPoint.title,
      detail: input.startingPoint.detail,
      href: input.startingPoint.href,
      label: "Start my starting point",
    };
  }

  const catchUp = input.catchUps.find(candidate => candidate.status !== "completed");
  if (catchUp) {
    return {
      kind: "catch_up",
      eyebrow: "Continue learning",
      title: catchUp.title,
      detail: "Complete this missed learning before moving further through the current unit.",
      href: catchUp.href,
      label: "Continue catch-up",
      meta: "Catch-up required",
    };
  }

  const allocation = [...input.allocations]
    .filter(candidate => !candidate.completed)
    .sort((left, right) => deadlineValue(left.deadlineAt) - deadlineValue(right.deadlineAt))[0];
  if (allocation) {
    const deadline = allocation.deadlineAt ? new Date(allocation.deadlineAt) : null;
    const overdue = deadline ? deadline.getTime() < input.now : false;
    return {
      kind: "allocation",
      eyebrow: "Continue learning",
      title: allocation.title,
      detail: overdue
        ? "This allocated activity is overdue. Complete it now so your progress record is up to date."
        : "This is your next allocated classwork or homework activity.",
      href: allocation.href,
      label: "Continue activity",
      meta: deadline
        ? `${overdue ? "Overdue" : "Due"} ${deadline.toLocaleDateString("en-GB", { timeZone: "UTC" })}`
        : "Ready now",
    };
  }

  if (input.journey) {
    return {
      kind: "journey",
      eyebrow: "Continue learning",
      title: input.journey.title,
      detail: input.journey.detail,
      href: input.journey.href,
      label: "Continue",
      meta: "Current unit",
    };
  }

  if (input.resume) {
    return {
      kind: "resume",
      eyebrow: "Continue learning",
      title: input.resume.title,
      detail: input.resume.detail,
      href: input.resume.href,
      label: "Continue where I stopped",
      meta: "Saved position",
    };
  }

  if (input.target) {
    return {
      kind: "target",
      eyebrow: "Continue learning",
      title: input.target.title,
      detail: input.target.detail,
      href: input.target.href,
      label: "Open target practice",
      meta: "Next target",
    };
  }

  if (input.unit) {
    return {
      kind: "unit",
      eyebrow: "Continue learning",
      title: input.unit.title,
      detail: input.unit.detail,
      href: input.unit.href,
      label: "Open my unit",
      meta: "Assigned unit",
    };
  }

  if (input.lesson) {
    return {
      kind: "lesson",
      eyebrow: "Continue learning",
      title: input.lesson.title,
      detail: input.lesson.detail,
      href: input.lesson.href,
      label: "Open lesson",
    };
  }

  return null;
}

function deadlineValue(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

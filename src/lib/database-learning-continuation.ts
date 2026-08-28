export type DatabaseActivityState = {
  activity_id: string;
  sequence_order: number;
  state: string;
  status_detail: string;
};

export type DatabaseActivity = {
  id: string;
  title: string;
};

export type DatabaseActivityContinuation = {
  activityId: string;
  activityTitle: string;
  state: "In Progress" | "Additional Practice Required" | "Available";
  statusDetail: string;
};

export type SavedLearningResume = {
  title: string;
  detail: string;
  href: string;
  updatedAt: string;
};

const actionableStates = new Set([
  "In Progress",
  "Additional Practice Required",
  "Available",
]);

export function selectDatabaseActivityContinuation(input: {
  savedActivityId: string;
  activities: DatabaseActivity[];
  states: DatabaseActivityState[];
}): DatabaseActivityContinuation | null {
  const activities = new Map(input.activities.map(activity => [activity.id, activity]));
  const ordered = [...input.states]
    .filter(state => activities.has(state.activity_id))
    .sort((left, right) => left.sequence_order - right.sequence_order);
  const saved = ordered.find(state => state.activity_id === input.savedActivityId);

  if (saved && actionableStates.has(saved.state)) {
    return continuation(saved, activities.get(saved.activity_id)!);
  }

  const afterSaved = saved
    ? ordered.filter(state => state.sequence_order > saved.sequence_order)
    : ordered;
  const next = preferredActionable(afterSaved) ?? preferredActionable(ordered);
  return next ? continuation(next, activities.get(next.activity_id)!) : null;
}

export function latestSavedLearningResume(
  left?: SavedLearningResume,
  right?: SavedLearningResume,
) {
  if (!left) return right;
  if (!right) return left;
  const leftTime = new Date(left.updatedAt).getTime();
  const rightTime = new Date(right.updatedAt).getTime();
  return Number.isFinite(rightTime) && (!Number.isFinite(leftTime) || rightTime > leftTime)
    ? right
    : left;
}

function preferredActionable(states: DatabaseActivityState[]) {
  return states.find(state => state.state === "In Progress")
    ?? states.find(state => state.state === "Additional Practice Required")
    ?? states.find(state => state.state === "Available")
    ?? null;
}

function continuation(state: DatabaseActivityState, activity: DatabaseActivity) {
  return {
    activityId: activity.id,
    activityTitle: activity.title,
    state: state.state as DatabaseActivityContinuation["state"],
    statusDetail: state.status_detail,
  };
}

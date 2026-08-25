type LearnerFilterEvidence = {
  baseLearnerIds: string[];
  studentId?: string;
  masteryFilterActive: boolean;
  masteryLearnerIds: string[];
  attemptFilterActive: boolean;
  attemptLearnerIds: string[];
  activityFilterActive: boolean;
  activityLearnerIds: string[];
  completionFilterActive: boolean;
  completionLearnerIds: string[];
};

export function selectTeacherDashboardLearners(input: LearnerFilterEvidence) {
  const selected = new Set(input.baseLearnerIds);
  if (input.studentId) intersect(selected, new Set([input.studentId]));
  if (input.masteryFilterActive) intersect(selected, new Set(input.masteryLearnerIds));
  if (input.attemptFilterActive) intersect(selected, new Set(input.attemptLearnerIds));
  if (input.activityFilterActive) intersect(selected, new Set(input.activityLearnerIds));
  if (input.completionFilterActive) intersect(selected, new Set(input.completionLearnerIds));
  return selected;
}

export function scopedTeacherAttention(input: {
  baseStatus: string;
  baseReason: string;
  catchUpStatus: string;
  outstandingCount: number;
  currentScore: number | null;
}) {
  if (input.baseStatus === "intervention_required" || input.catchUpStatus === "intervention_required")
    return { status: "intervention_required", reason: input.baseReason };
  if (["action_required", "catch_up_required", "reminder", "in_progress"].includes(input.catchUpStatus))
    return { status: input.catchUpStatus === "action_required" ? "action_required" : "catch_up_required", reason: input.baseReason };
  if (input.outstandingCount > 0)
    return { status: "catch_up_required", reason: input.baseReason };
  if (input.currentScore === null)
    return { status: "action_required", reason: "No recorded mastery evidence is available for the selected topic or skill." };
  if (input.currentScore >= 85)
    return { status: "exceeding", reason: "Current mastery evidence in the selected scope is at least 85%." };
  if (input.currentScore < 50)
    return { status: "action_required", reason: "Current mastery evidence in the selected scope is below 50%." };
  return { status: "on_track", reason: "No catch-up, overdue work or low mastery evidence is recorded in the selected scope." };
}

function intersect(target: Set<string>, allowed: Set<string>) {
  for (const learnerId of target) if (!allowed.has(learnerId)) target.delete(learnerId);
}

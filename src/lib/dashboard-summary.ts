export function summariseTeacherOverview(input: {
  enrolmentLearnerIds: string[];
  completedAssessmentLearnerIds: string[];
  attentionStatuses: string[];
}) {
  const enrolled = new Set(input.enrolmentLearnerIds);
  return {
    students: enrolled.size,
    activeEnrolments: input.enrolmentLearnerIds.length,
    completedAssessments: input.completedAssessmentLearnerIds.filter(id => enrolled.has(id)).length,
    needAttention: input.attentionStatuses.filter(status =>
      ["intervention_required", "action_required", "catch_up_required"].includes(status)
    ).length,
  };
}

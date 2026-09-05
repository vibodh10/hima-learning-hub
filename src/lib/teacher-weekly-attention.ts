export type WeeklyLearningGap = {
  learner_id: string;
  overdue_teaching_week: number;
  topic_code: string | null;
  attention_reason: string;
};

export function applyWeeklyLearningGaps<
  T extends { learner_id: string; attention_status: string; attention_reason: string },
>(rows: T[], gaps: WeeklyLearningGap[]) {
  const gapByLearner = new Map(gaps.map(gap => [gap.learner_id, gap]));
  return rows.map(row => {
    const gap = gapByLearner.get(row.learner_id);
    if (!gap || row.attention_status === "intervention_required") return row;
    return {
      ...row,
      attention_status: "action_required",
      attention_reason: gap.attention_reason,
    };
  });
}

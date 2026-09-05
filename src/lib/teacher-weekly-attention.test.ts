import { describe, expect, it } from "vitest";
import { applyWeeklyLearningGaps } from "./teacher-weekly-attention";

describe("applyWeeklyLearningGaps", () => {
  it("turns an overdue locked week into teacher action", () => {
    const [row] = applyWeeklyLearningGaps([
      { learner_id: "learner-1", attention_status: "on_track", attention_reason: "No concern." },
    ], [
      { learner_id: "learner-1", overdue_teaching_week: 2, topic_code: "A2", attention_reason: "Teaching Week 2 required work is incomplete. Teaching Week 3 remains locked." },
    ]);

    expect(row.attention_status).toBe("action_required");
    expect(row.attention_reason).toContain("Week 2");
  });

  it("does not hide a stronger intervention", () => {
    const [row] = applyWeeklyLearningGaps([
      { learner_id: "learner-1", attention_status: "intervention_required", attention_reason: "Professional review required." },
    ], [
      { learner_id: "learner-1", overdue_teaching_week: 2, topic_code: "A2", attention_reason: "Week incomplete." },
    ]);

    expect(row.attention_status).toBe("intervention_required");
    expect(row.attention_reason).toBe("Professional review required.");
  });
});

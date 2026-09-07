import { describe, expect, it } from "vitest";
import { sortTeacherAttention } from "./teacher-attention-order";
describe("teacher help order", () => {
  const row = (display_name: string, starting_score: number | null, current_score: number | null = null, attention_status = "action_required") => ({ display_name, starting_score, current_score, attention_status });
  it("sorts the reported starting-point-only cohort by score rather than name", () => {
    expect(sortTeacherAttention([row("adam", 66.7), row("Adam Maye", 90.5), row("Amarjit", 71.4), row("Ammar", 38.1)]).map(x => x.starting_score)).toEqual([38.1, 66.7, 71.4, 90.5]);
  });
  it("preserves urgent interventions, uses later scores, and does not turn missing evidence into zero", () => {
    expect(sortTeacherAttention([row("later", 20, 80), row("missing", null), row("lower", 40), row("urgent", 90, null, "intervention_required")]).map(x => x.display_name)).toEqual(["urgent", "missing", "lower", "later"]);
  });
});

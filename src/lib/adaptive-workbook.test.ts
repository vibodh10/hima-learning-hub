import { describe, expect, it } from "vitest";
import { decideTopicRoute, diagnosticQuestionsFor, expertiseFromEvidence, levelChoiceWarning, visualPathStatuses, type SkillEvidence } from "./adaptive-workbook";
import { configuredUnits } from "./learning-catalog";

const evidence = (correct: boolean, kind: SkillEvidence["kind"] = "initial_diagnostic", index = 0, extra: Partial<SkillEvidence> = {}): SkillEvidence => ({
  id: `e-${kind}-${index}`, kind, unitCode: "2", topicCode: "A1", skill: "relationships", difficulty: index === 2 ? 3 : 2,
  correct, independent: true, hintsUsed: 0, recordedAt: new Date().toISOString(), ...extra,
});

describe("adaptive workbook evidence rules", () => {
  it("creates three mapped diagnostic questions for every configured topic", () => {
    for (const unit of configuredUnits) {
      const questions = diagnosticQuestionsFor(unit);
      expect(questions).toHaveLength(unit.topics.length * 3);
      for (const topic of unit.topics) expect(questions.filter(item => item.topicCode === topic.code)).toHaveLength(3);
    }
  });

  it("does not fast-track from one correct answer", () => {
    expect(decideTopicRoute([evidence(true)]).status).toBe("In progress");
  });

  it("fast-tracks only secure diagnostic evidence and records a reason", () => {
    const decision = decideTopicRoute([evidence(true, "initial_diagnostic", 0), evidence(true, "initial_diagnostic", 1), evidence(true, "initial_diagnostic", 2)]);
    expect(decision.status).toBe("Fast-tracked through diagnostic evidence");
    expect(decision.reason).toContain("3/3");
  });

  it("uses a review route for mixed evidence", () => {
    expect(decideTopicRoute([evidence(true, "initial_diagnostic", 0), evidence(false, "initial_diagnostic", 1), evidence(true, "initial_diagnostic", 2)]).recommendedAction).toBe("targeted_practice");
  });

  it("detects repeated misconceptions and routes to teaching", () => {
    const items = [0,1,2].map(index => evidence(false, "independent_practice", index, { misconception: "Confuses a primary key with a foreign key" }));
    const decision = decideTopicRoute(items);
    expect(decision.status).toBe("Support required");
    expect(decision.reason).toContain("Repeated misconception");
  });

  it("requires three independent unhinted mastery tasks", () => {
    const hinted = evidence(true, "topic_mastery", 3, { hintsUsed: 1, independent: false });
    expect(decideTopicRoute([evidence(true,"topic_mastery",0), evidence(true,"topic_mastery",1), hinted]).status).not.toBe("Independently mastered");
    expect(decideTopicRoute([evidence(true,"topic_mastery",0), evidence(true,"topic_mastery",1), evidence(true,"topic_mastery",2)]).status).toBe("Independently mastered");
  });

  it("recommends four genuinely distinct levels and warns on large overrides", () => {
    expect(expertiseFromEvidence([evidence(false), evidence(false,"initial_diagnostic",1), evidence(false,"initial_diagnostic",2)])).toBe("Support");
    expect(expertiseFromEvidence([evidence(true), evidence(true,"initial_diagnostic",1), evidence(true,"initial_diagnostic",2)])).toBe("Stretch");
    expect(levelChoiceWarning("Challenge", "Support")).toContain("less scaffolding");
    expect(levelChoiceWarning("Core", "Support")).toBeNull();
  });

  it("shows one recommended next topic and locks later pathway steps", () => {
    const decisions = [decideTopicRoute([]), decideTopicRoute([]), decideTopicRoute([])];
    expect(visualPathStatuses(decisions)).toEqual(["Recommended", "Locked", "Locked"]);
  });
});

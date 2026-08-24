import { describe, expect, it } from "vitest";
import { decideTopicRoute, type SkillEvidence } from "./adaptive-workbook";
import { projectReady, topicKey, type LearningProgress } from "./learning-progress";

function item(kind: SkillEvidence["kind"], correct: boolean, index: number, extra: Partial<SkillEvidence> = {}): SkillEvidence {
  return { id: `${kind}-${index}`, kind, unitCode: "6", topicCode: "A1", skill: "website purpose", difficulty: index === 2 ? 3 : 2, correct, independent: true, hintsUsed: 0, recordedAt: "2026-08-02T10:00:00.000Z", ...extra };
}

describe("the eight required realistic learner journeys", () => {
  const evidenceDate = new Date("2026-08-03T00:00:00.000Z");
  it("1 substantial support: low diagnostic evidence routes to re-teaching", () => {
    expect(decideTopicRoute([item("initial_diagnostic",false,0),item("initial_diagnostic",false,1),item("initial_diagnostic",true,2)],evidenceDate).status).toBe("Support required");
  });
  it("2 expected level: mixed-secure evidence gets targeted Core review", () => {
    const route=decideTopicRoute([item("initial_diagnostic",true,0),item("initial_diagnostic",true,1),item("initial_diagnostic",false,2)],evidenceDate);
    expect(route.recommendedAction).toBe("targeted_practice"); expect(route.recommendedLevel).toBe("Core");
  });
  it("3 strong prior knowledge: secure difficult evidence recommends Stretch or Challenge", () => {
    const route=decideTopicRoute([item("initial_diagnostic",true,0,{difficulty:3}),item("initial_diagnostic",true,1,{difficulty:4}),item("initial_diagnostic",true,2)],evidenceDate);
    expect(["Stretch","Challenge"]).toContain(route.recommendedLevel);
  });
  it("4 fast-track: sufficient diagnostic evidence records the exact reason and retrieval date", () => {
    const route=decideTopicRoute([item("initial_diagnostic",true,0),item("initial_diagnostic",true,1),item("initial_diagnostic",true,2)],new Date("2026-08-03"));
    expect(route.status).toBe("Fast-tracked through diagnostic evidence"); expect(route.reason).toContain("3/3"); expect(route.retrievalDueAt).toBeTruthy();
  });
  it("5 mixed strengths and gaps: secure and insecure topics receive different routes", () => {
    const secure=decideTopicRoute([item("initial_diagnostic",true,0),item("initial_diagnostic",true,1),item("initial_diagnostic",true,2)],evidenceDate);
    const gap=decideTopicRoute([item("initial_diagnostic",false,0),item("initial_diagnostic",true,1),item("initial_diagnostic",false,2)],evidenceDate);
    expect(secure.status).not.toBe(gap.status);
  });
  it("6 repeated misconception: exact misconception returns targeted teaching", () => {
    const x={misconception:"Uses colour alone to communicate form errors"}; const route=decideTopicRoute([item("independent_practice",false,0,x),item("independent_practice",false,1,x)]);
    expect(route.reason).toContain(x.misconception);
  });
  it("7 support to mastery: supported work is excluded and three later independent checks establish mastery", () => {
    const supported=item("guided_practice",true,0,{independent:false,hintsUsed:2}); const mastery=[0,1,2].map(i=>item("topic_mastery",true,i));
    const route=decideTopicRoute([supported,...mastery],new Date("2026-08-03")); expect(route.status).toBe("Independently mastered"); expect(route.independentAttempts).toBe(3);
  });
  it("8 challenge project: every topic needs independent mastery, not page completion", () => {
    const required=["A1","A2"];
    const incomplete:LearningProgress={topics:{[topicKey("6","A1")]:{lessonCompletedAt:"now"}}}; expect(projectReady(incomplete,"6",required).ready).toBe(false);
    const complete:LearningProgress={topics:Object.fromEntries(required.map(code=>[topicKey("6",code),{lessonCompletedAt:"now",practiceScore:90,masteryScore:90,independentAttempts:3}]))}; expect(projectReady(complete,"6",required).ready).toBe(true);
  });
});

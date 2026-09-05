import { describe, expect, it } from "vitest";
import { configuredUnits, expertiseLevels, lessonFor, metaForUnit, topicHref } from "./learning-catalog";
import { projectReady, topicKey, type LearningProgress } from "./learning-progress";

describe("configured Pearson learner journey", () => {
  it("provides every configured unit, clickable topic route and project", () => {
    expect(configuredUnits.map(unit => unit.code)).toEqual(["1", "2", "4", "6", "8", "9", "10", "14", "19"]);
    for (const unit of configuredUnits) {
      expect(unit.topics.length).toBeGreaterThan(0);
      expect(metaForUnit(unit.code).project.deliverables.length).toBeGreaterThan(3);
      for (const topic of unit.topics) {
        expect(topicHref(unit.code, topic.code)).toContain(`/curriculum/units/${unit.code}/topics/`);
        expect(topic.content.length).toBeGreaterThan(2);
        const lesson = lessonFor(unit, topic, "Core");
        expect(new Set(lesson.mastery.comparablePrompts).size).toBeGreaterThanOrEqual(3);
        expect(lesson.independentTask.markScheme.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("changes explanation and scaffolding for each expertise level", () => {
    const unit = configuredUnits.find(item => item.code === "2")!;
    const topic = unit.topics[0];
    const lessons = expertiseLevels.map(level => lessonFor(unit, topic, level));
    expect(new Set(lessons.map(lesson => lesson.explanation.join(" "))).size).toBe(4);
    expect(lessons[0].guided.steps.length).toBeGreaterThan(lessons[3].guided.steps.length);
    expect(lessons[3].example.steps.length).toBeGreaterThan(lessons[0].example.steps.length);
  });

  it("uses the audited Pearson content-area codes for every added unit", () => {
    expect(configuredUnits.find(unit => unit.code === "1")?.topics.map(topic => topic.code)).toEqual(["A1–A2", "A3", "A4", "A5", "B1–B3", "C1–C2", "D1–D2", "E1", "E2", "E3", "F1–F2"]);
    expect(configuredUnits.find(unit => unit.code === "8")?.topics.map(topic => topic.code)).toEqual(["A1", "A2", "B1–B3", "C1–C3", "C4–C6"]);
    expect(configuredUnits.find(unit => unit.code === "9")?.topics.map(topic => topic.code)).toEqual(["A1", "A2–A3", "B1", "B2–B3", "C1–C2", "D1"]);
    expect(configuredUnits.find(unit => unit.code === "10")?.topics.map(topic => topic.code)).toEqual(["A1", "A2", "A3", "A4", "B1", "B2", "B3", "C1", "C2"]);
    expect(configuredUnits.find(unit => unit.code === "14")?.topics.map(topic => topic.code)).toEqual(["A1", "A2–A3", "B1–B2", "B3–B4", "C1–C2", "D1", "D2", "D3"]);
    expect(configuredUnits.find(unit => unit.code === "19")?.topics.map(topic => topic.code)).toEqual(["A1", "A2", "A3", "B1", "B2", "B3", "B4-B5", "C1", "C2", "C3"]);
    expect(metaForUnit("8").criteria).toContain("B.P3–B.P4, B.M2");
    expect(metaForUnit("9").criteria).toContain("D.P8–D.P9, D.M4, D.D4");
    expect(metaForUnit("10").criteria).toContain("C.P4–C.P6, C.M4–C.M6, C.D3");
    expect(metaForUnit("14").criteria).toContain("AO5 justified IT service solution design");
    expect(metaForUnit("19").criteria).toContain("BC.D2-BC.D3");
  });

  it("includes concrete code or technical examples where the subject requires them", () => {
    for (const [unitCode, topicCode] of [["2", "A2"], ["4", "A4"], ["6", "C1"], ["8", "C1–C3"], ["9", "C1–C2"], ["19", "C2"]]) {
      const unit = configuredUnits.find(item => item.code === unitCode)!;
      const topic = unit.topics.find(item => item.code === topicCode)!;
      const example = lessonFor(unit, topic, "Core").codeExample;
      expect(example?.code.length).toBeGreaterThan(80);
      expect(example?.caption.length).toBeGreaterThan(40);
    }
  });

  it("unlocks a project only from independent mastery evidence", () => {
    const unit = configuredUnits.find(item => item.code === "6")!;
    const empty: LearningProgress = { level: "Challenge", topics: {} };
    expect(projectReady(empty, unit.code, unit.topics.map(topic => topic.code)).ready).toBe(false);
    const mastered: LearningProgress = {
      level: "Support",
      topics: Object.fromEntries(unit.topics.map(topic => [topicKey(unit.code, topic.code), { lessonCompletedAt: "now", masteryScore: 80, independentAttempts: 3 }])),
    };
    expect(projectReady(mastered, unit.code, unit.topics.map(topic => topic.code))).toEqual({ ready: true, missing: [], percentage: 100, override: undefined });
  });
});

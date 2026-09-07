import { describe, expect, it } from "vitest";
import { unitByCode } from "./learning-catalog";
import { topicLearningPurpose } from "./topic-learning-purpose";

describe("learning versus assessed evidence", () => {
  it("connects Unit 6 Aim A to website comparisons without assuming assignment numbers", () => {
    const unit = unitByCode("6")!;
    for (const topic of unit.topics.filter(topic => topic.code.startsWith("A"))) {
      expect(topicLearningPurpose(unit, topic)).toContain("comparing and evaluating two websites");
      expect(topicLearningPurpose(unit, topic)).toContain("actual assignment brief");
    }
  });
  it("connects later Unit 6 topics to the design and development evidence", () => {
    const unit = unitByCode("6")!;
    expect(topicLearningPurpose(unit, unit.topics.find(topic => topic.code === "B1")!)).toContain("Learning aims B and C");
  });
  it("does not describe external exam preparation as a live assessment", () => {
    const unit = unitByCode("1")!;
    expect(topicLearningPurpose(unit, unit.topics[0])).toContain("not the live Pearson assessment");
  });
});

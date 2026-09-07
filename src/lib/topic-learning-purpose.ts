import type { PearsonTopic, PearsonUnit } from "./pearson-curriculum";
import { isExternalAssessmentUnit } from "./unit-assessment-kind";

export function topicLearningPurpose(unit: PearsonUnit, topic: PearsonTopic) {
  if (unit.code === "6") {
    if (topic.code.startsWith("A")) {
      return "This prepares you for Learning aim A: comparing and evaluating two websites. Use what you learn here to explain how design and performance affect the audience and purpose. Your actual assignment brief tells you what to submit.";
    }
    return "This prepares you for Learning aims B and C: designing, building, testing and reviewing a website for a client. Keep your own designs, decisions, tests and improvements as evidence, following your actual assignment brief.";
  }
  return isExternalAssessmentUnit(unit)
    ? "This lesson and practice prepare you for the unit's external assessment. These are practice activities, not the live Pearson assessment."
    : "This lesson and practice build skills for your assignment. Your actual assignment brief tells you what evidence to produce and submit.";
}

import { teachingSequenceFor } from "./btec-teaching";
import { expertiseLevels, type ExpertiseLevel } from "./learning-catalog";
import type { PearsonTopic, PearsonUnit } from "./pearson-curriculum";

const namedSections = new Set(["teaching", "practice", "mastery", "retrieval"]);

export function curriculumPositionSection(
  unit: PearsonUnit,
  topic: PearsonTopic,
  requestedSection: string,
  storedLevel: string | null | undefined,
) {
  if (namedSections.has(requestedSection)) return requestedSection;
  const match = /^lesson:(\d+)$/.exec(requestedSection);
  if (!match) return null;
  const level = expertiseLevels.includes(storedLevel as ExpertiseLevel)
    ? storedLevel as ExpertiseLevel
    : "Core";
  const lessonNumber = Number(match[1]);
  const lessonCount = teachingSequenceFor(unit, topic, level).length;
  return Number.isInteger(lessonNumber) && lessonNumber >= 1 && lessonNumber <= lessonCount
    ? `lesson:${lessonNumber}`
    : null;
}

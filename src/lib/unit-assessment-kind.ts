import type { PearsonUnit } from "./pearson-curriculum";

export function isExternalAssessmentUnit(unit: PearsonUnit) {
  return /externally assessed|external set task/i.test(unit.assessment);
}

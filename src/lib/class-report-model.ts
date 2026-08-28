import { evidenceCounts, hasValidComparableProgress } from "./learner-report-model";
import { csvCell } from "./report";

export type ClassReportComparison = {
  learnerId: string;
  startingPercentage: number;
  latestPercentage: number | null;
  improvementPoints: number | null;
  evidence: unknown;
  progressDate: string | null;
};

export type ClassReportAllocation = {
  id: string;
  learnerId: string | null;
  activityId: string;
  releaseAt: string | null;
  deadlineAt: string | null;
  required: boolean;
  classScopeSource?: string | null;
};

export type ClassReportAttempt = {
  learnerId: string;
  activityId: string;
  allocationId: string | null;
  completedAt: string;
};

export type ClassReportInput = {
  className: string;
  courseTitle: string;
  units: string[];
  generatedAt: string;
  learners: { id: string; name: string }[];
  comparisons: ClassReportComparison[];
  mastery: { learnerId: string; currentPathway: string }[];
  allocations: ClassReportAllocation[];
  attempts: ClassReportAttempt[];
  misconceptions: { learnerId: string; title: string; occurrenceCount: number }[];
  actions: { action: string; reason: string; createdAt: string }[];
};

export type ClassReportRow = {
  learnerId: string;
  learner: string;
  starting: number | null;
  latest: number | null;
  improvement: number | null;
  comparableSkills: number;
  supportPathways: number;
  masteryPathways: number;
  allocatedCompleted: number;
  allocatedTotal: number;
  overdueRequired: number;
};

export type ClassReport = {
  name: string;
  course: string;
  units: string[];
  generatedAt: string;
  rows: ClassReportRow[];
  misconceptions: { title: string; occurrenceCount: number; learnerCount: number }[];
  actions: { action: string; reason: string; createdAt: string }[];
};

export function projectClassReport(input: ClassReportInput): ClassReport {
  const asAt = Date.parse(input.generatedAt);
  const rows = [...input.learners]
    .sort((left, right) => left.name.localeCompare(right.name, "en-GB"))
    .map(learner => {
      const comparisons = input.comparisons.filter(item => item.learnerId === learner.id);
      const sufficientStarting = comparisons.filter(item =>
        evidenceCounts(item.evidence).startingSufficient && Number.isFinite(item.startingPercentage));
      const validComparable = comparisons.filter(item => hasValidComparableProgress({
        latestPercentage: finiteOrNull(item.latestPercentage),
        improvementPoints: finiteOrNull(item.improvementPoints),
        evidence: item.evidence,
        progressDate: item.progressDate,
      }));
      const mastery = input.mastery.filter(item => item.learnerId === learner.id);
      const allocations = uniqueAllocations(input.allocations.filter(item =>
        item.learnerId == null || item.learnerId === learner.id));
      const attempts = input.attempts.filter(item => item.learnerId === learner.id);
      const completedAllocationIds = matchCompletedAllocationIds(allocations, attempts);
      const overdueRequired = allocations.filter(allocation => allocation.required &&
        !completedAllocationIds.has(allocation.id) && isPast(allocation.deadlineAt, asAt)).length;

      return {
        learnerId: learner.id,
        learner: learner.name,
        starting: average(sufficientStarting.map(item => item.startingPercentage)),
        latest: average(validComparable.flatMap(item => item.latestPercentage == null ? [] : [item.latestPercentage])),
        improvement: average(validComparable.flatMap(item => item.improvementPoints == null ? [] : [item.improvementPoints])),
        comparableSkills: validComparable.length,
        supportPathways: mastery.filter(item => item.currentPathway === "Support").length,
        masteryPathways: mastery.filter(item => item.currentPathway === "Mastery").length,
        allocatedCompleted: completedAllocationIds.size,
        allocatedTotal: allocations.length,
        overdueRequired,
      } satisfies ClassReportRow;
    });

  return {
    name: input.className,
    course: input.courseTitle,
    units: input.units,
    generatedAt: input.generatedAt,
    rows,
    misconceptions: aggregateMisconceptions(input.misconceptions),
    actions: [...input.actions].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
  };
}

export function classReportCsv(report: ClassReport) {
  const rows: unknown[][] = [
    ["Class evidence report"],
    ["Class", report.name],
    ["Course", report.course],
    ["Active selected units", report.units.length ? report.units.join("; ") : "None selected"],
    ["Generated", report.generatedAt],
    [],
    [
      "Learner", "Sufficient starting point", "Verified latest progress", "Comparable change",
      "Comparable skills", "Support-pathway skills", "Mastery-pathway skills",
      "Allocated activities completed", "Allocated activities total", "Overdue required activities",
    ],
  ];
  report.rows.forEach(row => rows.push([
    row.learner,
    percentageOrMissing(row.starting),
    percentageOrMissing(row.latest),
    row.improvement == null ? "Not yet calculable" : `${signed(row.improvement)} percentage points`,
    row.comparableSkills,
    row.supportPathways,
    row.masteryPathways,
    row.allocatedCompleted,
    row.allocatedTotal,
    row.overdueRequired,
  ]));
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}

export function matchCompletedAllocationIds(
  allocations: ClassReportAllocation[], attempts: ClassReportAttempt[],
) {
  const completed = new Set<string>();
  const usedAttempts = new Set<number>();
  for (const allocation of allocations) {
    const exactIndex = attempts.findIndex((attempt, index) =>
      !usedAttempts.has(index) && attempt.allocationId === allocation.id);
    if (exactIndex >= 0) {
      completed.add(allocation.id);
      usedAttempts.add(exactIndex);
    }
  }
  const legacyAllocations = allocations.filter(allocation =>
    !completed.has(allocation.id) && allocation.classScopeSource !== "explicit")
    .sort((left, right) => timestamp(left.releaseAt, Number.NEGATIVE_INFINITY) -
      timestamp(right.releaseAt, Number.NEGATIVE_INFINITY));
  for (const allocation of legacyAllocations) {
    const releaseAt = timestamp(allocation.releaseAt, Number.NEGATIVE_INFINITY);
    const legacyIndex = attempts
      .map((attempt, index) => ({ attempt, index }))
      .filter(({ attempt, index }) => !usedAttempts.has(index) && !attempt.allocationId &&
        attempt.activityId === allocation.activityId && timestamp(attempt.completedAt, Number.NaN) >= releaseAt)
      .sort((left, right) => Date.parse(left.attempt.completedAt) - Date.parse(right.attempt.completedAt))[0]?.index;
    if (legacyIndex != null) {
      completed.add(allocation.id);
      usedAttempts.add(legacyIndex);
    }
  }
  return completed;
}

function uniqueAllocations(items: ClassReportAllocation[]) {
  return [...new Map(items.map(item => [item.id, item])).values()];
}

function aggregateMisconceptions(items: ClassReportInput["misconceptions"]) {
  const aggregate = new Map<string, { occurrenceCount: number; learners: Set<string> }>();
  for (const item of items) {
    const current = aggregate.get(item.title) ?? { occurrenceCount: 0, learners: new Set<string>() };
    current.occurrenceCount += Number.isFinite(item.occurrenceCount) ? item.occurrenceCount : 0;
    current.learners.add(item.learnerId);
    aggregate.set(item.title, current);
  }
  return [...aggregate.entries()].map(([title, value]) => ({
    title,
    occurrenceCount: value.occurrenceCount,
    learnerCount: value.learners.size,
  })).sort((left, right) => right.occurrenceCount - left.occurrenceCount || left.title.localeCompare(right.title, "en-GB"));
}

function average(values: number[]) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : null;
}

function finiteOrNull(value: number | null) {
  return value != null && Number.isFinite(value) ? value : null;
}

function isPast(value: string | null, asAt: number) {
  if (!value || !Number.isFinite(asAt)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp < asAt;
}

function timestamp(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percentageOrMissing(value: number | null) {
  return value == null ? "Not yet recorded" : `${value}%`;
}

function signed(value: number) {
  const rounded = round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

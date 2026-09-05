import { configuredUnitJourneys, type ConfiguredJourneyWeek } from "./unit-journeys";
import { topicKey, type LearningProgress } from "./learning-progress";

export type StudentWeekAccess = {
  scheduledWeek: number;
  scheduled: ConfiguredJourneyWeek;
  focus: ConfiguredJourneyWeek;
  previous?: ConfiguredJourneyWeek;
  history: ConfiguredJourneyWeek[];
  allowedTopicCodes: string[];
  currentWeekBlocked: boolean;
};

export function buildStudentWeekAccess(
  unitCode: string,
  teachingWeek: number,
  progress: LearningProgress,
  startingPointComplete: boolean,
): StudentWeekAccess | null {
  if (!(unitCode in configuredUnitJourneys)) return null;
  const journey = configuredUnitJourneys[unitCode as keyof typeof configuredUnitJourneys];
  const scheduledWeek = Math.max(1, Math.min(journey.length, Math.trunc(teachingWeek)));
  const scheduled = journey[scheduledWeek - 1];
  if (!scheduled) return null;

  const earlierIncomplete = journey
    .filter(week => week.week < scheduledWeek)
    .find(week => !weekComplete(unitCode, week, progress, startingPointComplete));
  const focus = earlierIncomplete ?? scheduled;
  const allowedTopicCodes = startingPointComplete
    ? [...new Set(journey.filter(week => week.week <= focus.week).map(week => week.topicCode))]
    : [];
  const previous = journey.find(week => week.week === focus.week - 1);
  const visibleCodes = new Set([focus.topicCode, previous?.topicCode].filter(Boolean));
  const history = journey.filter(week => week.week < focus.week
    && weekComplete(unitCode, week, progress, startingPointComplete)
    && !visibleCodes.has(week.topicCode));

  return {
    scheduledWeek,
    scheduled,
    focus,
    previous,
    history,
    allowedTopicCodes,
    currentWeekBlocked: focus.week < scheduledWeek,
  };
}

export function weekComplete(
  unitCode: string,
  week: ConfiguredJourneyWeek,
  progress: LearningProgress,
  startingPointComplete: boolean,
) {
  if (week.milestone === "starting_point") return startingPointComplete;
  const evidence = progress.topics[topicKey(unitCode, week.topicCode)];
  return Boolean(evidence?.masteredAt)
    || (Number(evidence?.independentAttempts ?? 0) >= 3 && Number(evidence?.masteryScore ?? 0) >= 80);
}

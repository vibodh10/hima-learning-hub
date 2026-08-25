export type NonTeachingPeriod = {
  startsOn: string;
  endsOn: string;
  title?: string;
};

export type TeachingJourneyPosition = {
  state: "in_progress" | "paused" | "completed";
  teachingWeek: number;
  totalTeachingWeeks: number;
  currentWeekStartedOn: string;
  nextTeachingOn: string | null;
  pauseReason: string | null;
};

export function calculateTeachingJourneyPosition({
  startedOn,
  weeklyLearningDay,
  totalTeachingWeeks = 12,
  asOf,
  nonTeachingPeriods,
}: {
  startedOn: string;
  weeklyLearningDay: number;
  totalTeachingWeeks?: number;
  asOf: string;
  nonTeachingPeriods: NonTeachingPeriod[];
}): TeachingJourneyPosition {
  if (!Number.isInteger(weeklyLearningDay) || weeklyLearningDay < 1 || weeklyLearningDay > 7) {
    throw new Error("weeklyLearningDay must be an ISO weekday from 1 to 7");
  }
  if (!Number.isInteger(totalTeachingWeeks) || totalTeachingWeeks < 1 || totalTeachingWeeks > 52) {
    throw new Error("totalTeachingWeeks must be between 1 and 52");
  }

  const start = parseIsoDate(startedOn);
  const current = parseIsoDate(asOf);
  const periods = nonTeachingPeriods.map(period => ({
    start: parseIsoDate(period.startsOn),
    end: parseIsoDate(period.endsOn),
    title: period.title?.trim() || "Non-teaching period",
  }));
  if (periods.some(period => period.end < period.start)) throw new Error("Non-teaching period ends before it starts");

  const firstSession = nextIsoWeekday(start, weeklyLearningDay);
  const sessions: Date[] = [];
  let candidate = firstSession;
  // One extra eligible session is the boundary after the final teaching week.
  while (sessions.length < totalTeachingWeeks + 1) {
    if (!periods.some(period => within(candidate, period.start, period.end))) sessions.push(candidate);
    candidate = addDays(candidate, 7);
  }

  const elapsed = sessions.filter(session => session <= current).length;
  const completed = elapsed > totalTeachingWeeks;
  const teachingWeek = Math.min(Math.max(elapsed, 1), totalTeachingWeeks);
  const pause = periods.find(period => within(current, period.start, period.end));
  const currentWeekStarted = elapsed > 0 ? sessions[Math.min(elapsed - 1, totalTeachingWeeks - 1)] : start;

  return {
    state: completed ? "completed" : pause ? "paused" : "in_progress",
    teachingWeek,
    totalTeachingWeeks,
    currentWeekStartedOn: formatIsoDate(currentWeekStarted),
    nextTeachingOn: completed ? null : formatIsoDate(sessions[elapsed]),
    pauseReason: pause?.title ?? null,
  };
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ISO date: ${value}`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatIsoDate(date) !== value) throw new Error(`Invalid ISO date: ${value}`);
  return date;
}

function formatIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number) {
  const copy = new Date(value);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function nextIsoWeekday(value: Date, isoWeekday: number) {
  const currentIsoWeekday = value.getUTCDay() || 7;
  return addDays(value, (isoWeekday - currentIsoWeekday + 7) % 7);
}

function within(value: Date, start: Date, end: Date) {
  return value >= start && value <= end;
}

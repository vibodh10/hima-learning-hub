export const ISO_WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;

export function normaliseWeeklyLearningDays(
  weeklyLearningDays: number[] | null | undefined,
  weeklyLearningDay?: number | null,
) {
  const values = weeklyLearningDays?.length
    ? weeklyLearningDays
    : weeklyLearningDay == null
      ? []
      : [weeklyLearningDay];
  return [...new Set(values)]
    .filter(value => Number.isInteger(value) && value >= 1 && value <= 7)
    .sort((left, right) => left - right);
}

export function formatWeeklyLearningDays(
  weeklyLearningDays: number[] | null | undefined,
  weeklyLearningDay?: number | null,
) {
  const days = normaliseWeeklyLearningDays(weeklyLearningDays, weeklyLearningDay);
  if (!days.length) return "Teaching days not set";
  return days.map(day => ISO_WEEKDAYS.find(option => option.value === day)?.label).filter(Boolean).join(" / ");
}

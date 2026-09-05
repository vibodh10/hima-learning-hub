export type ReportPeriod = { from: string; to: string };

export function currentTeachingWeek(date: Date): ReportPeriod {
  const day = date.getUTCDay() || 7;
  const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day + 1));
  const to = new Date(from);
  to.setUTCDate(from.getUTCDate() + 6);
  return { from: isoDate(from), to: isoDate(to) };
}

export function currentCalendarQuarter(date: Date): ReportPeriod {
  const quarterStartMonth = Math.floor(date.getUTCMonth() / 3) * 3;
  const from = new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1));
  const to = new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth + 3, 0));
  return { from: isoDate(from), to: isoDate(to) };
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

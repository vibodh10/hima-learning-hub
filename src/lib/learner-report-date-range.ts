type Row = Record<string, unknown>;

export type LearnerReportDateRange = {
  from: string | null;
  to: string | null;
  startAt: number | null;
  endExclusiveAt: number | null;
};

export type LearnerReportDateRangeResult =
  | { ok: true; range: LearnerReportDateRange }
  | { ok: false; message: string };

export type DateScopedLearnerEvidence = {
  comparisons: Row[];
  mastery: Row[];
  attempts: Row[];
  targets: Row[];
  feedback: Row[];
  misconceptions: Row[];
  teacherActions: Row[];
  snapshots: Row[];
  retrieval: Row[];
  badges: Row[];
  coins: Row[];
  assessments: Row[];
  overrides: Row[];
  curriculumAttempts: Row[];
  achievement?: Row;
  portfolioArtifacts?: Row[];
  worksheets?: Row[];
  catchUpRecords?: Row[];
  recognitions?: Row[];
  attendanceEvents?: Row[];
  certificateReviews?: Row[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseLearnerReportDateRange(searchParams: URLSearchParams): LearnerReportDateRangeResult {
  const from = clean(searchParams.get("from"));
  const to = clean(searchParams.get("to"));
  if (!from && !to) return { ok: true, range: { from: null, to: null, startAt: null, endExclusiveAt: null } };
  if (from && !validIsoDate(from)) return { ok: false, message: "Choose a valid report start date." };
  if (to && !validIsoDate(to)) return { ok: false, message: "Choose a valid report end date." };
  const startAt = from ? dateStart(from) : null;
  const endExclusiveAt = to ? nextDateStart(to) : null;
  if (startAt != null && endExclusiveAt != null && startAt >= endExclusiveAt) {
    return { ok: false, message: "The report start date must be on or before the end date." };
  }
  return { ok: true, range: { from, to, startAt, endExclusiveAt } };
}

export function learnerReportDateRangeLabel(range: LearnerReportDateRange, exportedAt: string) {
  if (!range.from && !range.to) return `All recorded evidence through ${displayDate(exportedAt)}`;
  if (range.from && range.to) return `${displayDate(range.from)} to ${displayDate(range.to)} (inclusive)`;
  if (range.from) return `From ${displayDate(range.from)} through ${displayDate(exportedAt)}`;
  return `Up to ${displayDate(range.to)}`;
}

export function learnerReportDateRangeSuffix(range: LearnerReportDateRange) {
  if (!range.from && !range.to) return "";
  return `-${range.from ?? "start"}-to-${range.to ?? "present"}`;
}

export function scopeLearnerEvidenceToDateRange<T extends DateScopedLearnerEvidence>(
  evidence: T,
  range: LearnerReportDateRange,
): T {
  if (!range.from && !range.to) return evidence;
  return {
    ...evidence,
    comparisons: evidence.comparisons.filter(row => anyDateInRange(row, range, [
      nestedDate(row.starting_result, "created_at"),
      nestedAssessmentDate(row.starting_result),
      nestedDate(row.progress_result, "created_at"),
      nestedAssessmentDate(row.progress_result),
    ])),
    // Mastery is a current aggregate without a reliable historical timestamp, so it is
    // deliberately omitted from a period export rather than presented as historical fact.
    mastery: [],
    attempts: filter(evidence.attempts, range, "completed_at"),
    targets: evidence.targets.filter(row => intervalOverlapsRange(
      text(row.starts_on) ?? text(row.created_at),
      text(row.review_on) ?? text(row.target_date) ?? text(row.starts_on) ?? text(row.created_at),
      range,
    )),
    feedback: evidence.feedback.filter(row => {
      const answer = related(row.attempt_answers);
      const attempt = related(answer?.attempts);
      return anyDateInRange(row, range, [
        text(row.reviewed_at), text(answer?.answered_at), text(attempt?.completed_at),
      ]);
    }),
    misconceptions: filter(evidence.misconceptions, range, "first_seen_at", "last_seen_at", "resolved_at"),
    teacherActions: filter(evidence.teacherActions, range, "created_at", "review_on"),
    snapshots: filter(evidence.snapshots, range, "created_at"),
    retrieval: filter(evidence.retrieval, range, "scheduled_for", "completed_at"),
    badges: filter(evidence.badges, range, "awarded_at"),
    coins: filter(evidence.coins, range, "created_at"),
    assessments: filter(evidence.assessments, range, "completed_at"),
    overrides: filter(evidence.overrides, range, "created_at", "expires_at", "revoked_at"),
    curriculumAttempts: filter(evidence.curriculumAttempts, range, "completed_at", "reviewed_at"),
    achievement: undefined,
    portfolioArtifacts: filter(evidence.portfolioArtifacts ?? [], range, "recorded_at"),
    worksheets: filter(evidence.worksheets ?? [], range, "submitted_at"),
    catchUpRecords: filter(evidence.catchUpRecords ?? [], range, "opened_at", "completed_at"),
    recognitions: filter(evidence.recognitions ?? [], range, "recognised_at"),
    attendanceEvents: filter(evidence.attendanceEvents ?? [], range, "session_on", "imported_at"),
    certificateReviews: filter(evidence.certificateReviews ?? [], range, "eligible_at", "reviewed_at"),
  };
}

function filter(rows: Row[], range: LearnerReportDateRange, ...keys: string[]) {
  return rows.filter(row => anyDateInRange(row, range, keys.map(key => text(row[key]))));
}

function anyDateInRange(_row: Row, range: LearnerReportDateRange, values: (string | null)[]) {
  return values.some(value => value != null && dateInRange(value, range));
}

function dateInRange(value: string, range: LearnerReportDateRange) {
  const at = Date.parse(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (!Number.isFinite(at)) return false;
  return (range.startAt == null || at >= range.startAt) &&
    (range.endExclusiveAt == null || at < range.endExclusiveAt);
}

function intervalOverlapsRange(start: string | null, end: string | null, range: LearnerReportDateRange) {
  if (!start && !end) return false;
  const startAt = start ? Date.parse(start.length === 10 ? `${start}T00:00:00Z` : start) : Number.NEGATIVE_INFINITY;
  const endAt = end ? Date.parse(end.length === 10 ? `${end}T23:59:59.999Z` : end) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(startAt) && startAt !== Number.NEGATIVE_INFINITY) return false;
  if (!Number.isFinite(endAt) && endAt !== Number.POSITIVE_INFINITY) return false;
  return (range.endExclusiveAt == null || startAt < range.endExclusiveAt) &&
    (range.startAt == null || endAt >= range.startAt);
}

function nestedAssessmentDate(value: unknown) {
  const row = related(value);
  return text(related(row?.assessment_instances)?.completed_at);
}

function nestedDate(value: unknown, key: string) {
  return text(related(value)?.[key]);
}

function related(value: unknown): Row | undefined {
  return Array.isArray(value)
    ? value[0] && typeof value[0] === "object" ? value[0] as Row : undefined
    : value && typeof value === "object" ? value as Row : undefined;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function clean(value: string | null) {
  return value?.trim() || null;
}

function validIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function dateStart(value: string) {
  return Date.parse(`${value}T00:00:00Z`);
}

function nextDateStart(value: string) {
  return dateStart(value) + 24 * 60 * 60 * 1000;
}

function displayDate(value: string | null) {
  if (!value) return "not specified";
  return new Date(value.length === 10 ? `${value}T12:00:00Z` : value).toLocaleDateString("en-GB", { timeZone: "UTC" });
}

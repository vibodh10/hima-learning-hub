import { isPriorExperienceSkill } from "./learner-report-model";

export type LearnerReportScope = {
  classId: string;
  courseId: string;
  unitIds: ReadonlySet<string>;
  unitCodes: ReadonlySet<string>;
};

export type ReportAcademicNode = {
  courseId?: string | null;
  unitId?: string | null;
  unitCode?: string | null;
  topicTitle?: string | null;
  skillTitle?: string | null;
  assessmentKind?: string | null;
};

export function selectReportEnrolment<T extends { classId: string }>(
  enrolments: T[],
  requestedClassId: string,
) {
  return enrolments.find(enrolment => enrolment.classId === requestedClassId) ?? null;
}

export function academicNodeInScope(scope: LearnerReportScope, node: ReportAcademicNode) {
  if (node.courseId && node.courseId !== scope.courseId) return false;
  if (node.unitId && scope.unitIds.has(node.unitId)) return true;
  if (node.unitCode && scope.unitCodes.has(node.unitCode)) return true;
  return node.assessmentKind === "course_starting_point" ||
    node.topicTitle?.trim().toLowerCase() === "course starting point" ||
    isPriorExperienceSkill(node.skillTitle ?? "");
}

export function targetInScope(scope: LearnerReportScope, target: {
  classId?: string | null;
  courseId?: string | null;
  unitId?: string | null;
}) {
  if (target.classId && target.classId !== scope.classId) return false;
  if (target.courseId && target.courseId !== scope.courseId) return false;
  if (target.unitId) return scope.unitIds.has(target.unitId);
  return target.classId === scope.classId || target.courseId === scope.courseId;
}

export function skillRecordInScope(scope: LearnerReportScope, value: unknown) {
  const skill = related(value);
  const topic = related(skill?.topics);
  const unit = related(topic?.units);
  return academicNodeInScope(scope, {
    courseId: text(unit?.course_id),
    unitId: text(unit?.id),
    unitCode: text(unit?.code),
    topicTitle: text(topic?.title),
    skillTitle: text(skill?.title),
  });
}

export function topicRecordInScope(scope: LearnerReportScope, value: unknown) {
  const topic = related(value);
  const unit = related(topic?.units);
  return academicNodeInScope(scope, {
    courseId: text(unit?.course_id),
    unitId: text(unit?.id),
    unitCode: text(unit?.code),
    topicTitle: text(topic?.title),
  });
}

export function activityRecordInScope(scope: LearnerReportScope, value: unknown) {
  const activity = related(value);
  const lesson = related(activity?.lessons);
  const topic = related(lesson?.topics);
  const unit = related(topic?.units);
  return academicNodeInScope(scope, {
    courseId: text(unit?.course_id),
    unitId: text(unit?.id),
    unitCode: text(unit?.code),
    topicTitle: text(topic?.title),
    assessmentKind: text(activity?.assessment_kind),
  });
}

export function feedbackRecordInScope(scope: LearnerReportScope, value: unknown) {
  const review = record(value);
  const answer = related(review.attempt_answers);
  const attempt = related(answer?.attempts);
  const question = related(answer?.questions);
  return activityRecordInScope(scope, attempt?.activities) ||
    skillRecordInScope(scope, question?.skills);
}

export function targetRecordInScope(scope: LearnerReportScope, value: unknown) {
  const target = record(value);
  const classId = text(target.class_id);
  const courseId = text(target.course_id);
  if (classId && classId !== scope.classId) return false;
  if (courseId && courseId !== scope.courseId) return false;
  if (skillRecordInScope(scope, target.skills) || topicRecordInScope(scope, target.topics)) return true;
  const unit = related(target.units);
  const topic = related(target.topics);
  const skill = related(target.skills);
  const skillTopic = related(skill?.topics);
  return targetInScope(scope, {
    classId,
    courseId,
    unitId: text(target.unit_id) ?? text(unit?.id) ?? text(related(topic?.units)?.id) ??
      text(related(skillTopic?.units)?.id),
  });
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function related(value: unknown): Record<string, unknown> | undefined {
  return Array.isArray(value)
    ? record(value[0])
    : value && typeof value === "object"
      ? value as Record<string, unknown>
      : undefined;
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

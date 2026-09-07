// Course baseline records historically live below Unit 1, but are not Unit 1 assessments.
export function assessmentParentLabel(value: unknown): string {
  const activity = related(value);
  const lesson = related(activity.lessons);
  const topic = related(lesson.topics);
  const unit = related(topic.units);
  if (activity.assessment_kind === "course_starting_point" || topic.title === "Course starting point") {
    return "Course baseline · general background (not a unit assessment)";
  }
  return `${String(unit.code ?? "Course")} ${String(unit.title ?? "starting point and learner background")} · ${String(topic.title ?? "Topic not linked")}`;
}
function related(value: unknown): Record<string, unknown> {
  const row = Array.isArray(value) ? value[0] : value;
  return row && typeof row === "object" ? row as Record<string, unknown> : {};
}

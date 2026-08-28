import { describe, expect, it } from "vitest";
import {
  academicNodeInScope,
  activityRecordInScope,
  feedbackRecordInScope,
  selectReportEnrolment,
  skillRecordInScope,
  targetRecordInScope,
  targetInScope,
  type LearnerReportScope,
} from "./learner-report-scope";

const scope: LearnerReportScope = {
  classId: "class-a",
  courseId: "course-a",
  unitIds: new Set(["unit-4"]),
  unitCodes: new Set(["4"]),
};

describe("learner report class scope", () => {
  it("selects only the explicitly requested enrolment", () => {
    const enrolments = [{ classId: "class-a", name: "A" }, { classId: "class-b", name: "B" }];
    expect(selectReportEnrolment(enrolments, "class-b")?.name).toBe("B");
    expect(selectReportEnrolment(enrolments, "class-c")).toBeNull();
  });

  it("includes selected-unit evidence and excludes another unit", () => {
    expect(academicNodeInScope(scope, { unitId: "unit-4" })).toBe(true);
    expect(academicNodeInScope(scope, { unitCode: "4" })).toBe(true);
    expect(academicNodeInScope(scope, { unitId: "unit-2", unitCode: "2" })).toBe(false);
  });

  it("retains course starting-point and prior-experience context", () => {
    expect(academicNodeInScope(scope, { assessmentKind: "course_starting_point" })).toBe(true);
    expect(academicNodeInScope(scope, { topicTitle: "Course starting point" })).toBe(true);
    expect(academicNodeInScope(scope, { skillTitle: "Programming experience" })).toBe(true);
    expect(academicNodeInScope(scope, {
      courseId: "course-b",
      skillTitle: "Programming experience",
    })).toBe(false);
    expect(academicNodeInScope(scope, { skillTitle: "User experience design" })).toBe(false);
  });

  it("does not let a class match override an explicitly unrelated target unit", () => {
    expect(targetInScope(scope, { classId: "class-a", unitId: "unit-2" })).toBe(false);
    expect(targetInScope(scope, { classId: "class-b", unitId: "unit-4" })).toBe(false);
    expect(targetInScope(scope, { courseId: "course-b", unitId: "unit-4" })).toBe(false);
    expect(targetInScope(scope, { classId: "class-a" })).toBe(true);
    expect(targetInScope(scope, { courseId: "course-a" })).toBe(true);
  });

  it("scopes nested skill, activity and feedback records", () => {
    const selectedSkill = { title: "Iteration", topics: { title: "Loops", units: { id: "unit-4", code: "4" } } };
    const otherActivity = { assessment_kind: null, lessons: { topics: { title: "Networks", units: { id: "unit-2", code: "2" } } } };
    expect(skillRecordInScope(scope, selectedSkill)).toBe(true);
    expect(activityRecordInScope(scope, otherActivity)).toBe(false);
    expect(feedbackRecordInScope(scope, {
      attempt_answers: { questions: { skills: selectedSkill } },
    })).toBe(true);
  });

  it("scopes a nested target before considering its broader class link", () => {
    expect(targetRecordInScope(scope, {
      class_id: "class-a",
      topics: { units: { id: "unit-2", code: "2" } },
    })).toBe(false);
    expect(targetRecordInScope(scope, {
      class_id: "class-b",
      topics: { units: { id: "unit-4", code: "4" } },
    })).toBe(false);
    expect(targetRecordInScope(scope, { class_id: "class-a" })).toBe(true);
  });
});

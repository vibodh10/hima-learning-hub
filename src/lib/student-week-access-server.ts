import "server-only";
import { redirect } from "next/navigation";
import { getSessionProfile } from "./auth";
import { loadCurriculumProgress } from "./curriculum-progress-server";
import { createClient } from "./supabase/server";
import { buildStudentWeekAccess } from "./student-week-access";
import { loadUnitStartingPointStatus } from "./unit-starting-point-server";

export async function loadStudentWeekAccess(learnerId: string, unitCode: string) {
  const [journey, progress, startingPoint] = await Promise.all([
    loadStudentUnitJourney(learnerId, unitCode),
    loadCurriculumProgress(),
    loadUnitStartingPointStatus(learnerId, unitCode),
  ]);
  if (!journey || !progress) return { access: null, progress, startingPoint };
  return {
    access: buildStudentWeekAccess(unitCode, journey.teachingWeek, progress, startingPoint.complete),
    progress,
    startingPoint,
  };
}

export async function canStudentAccessCurriculumTopic(learnerId: string, unitCode: string, topicCode: string) {
  const { access } = await loadStudentWeekAccess(learnerId, unitCode);
  return Boolean(access?.allowedTopicCodes.includes(topicCode));
}

export async function requireCurriculumTopicAccess(unitCode: string, topicCode: string) {
  const actor = await getSessionProfile();
  if (!actor) redirect("/login");
  if (actor.role !== "student") return actor;
  if (!await canStudentAccessCurriculumTopic(actor.id, unitCode, topicCode)) {
    redirect(`/curriculum/units/${unitCode}`);
  }
  return actor;
}

async function loadStudentUnitJourney(learnerId: string, unitCode: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("enrolments")
    .select("class_id,classes(id,published,class_units(active,archived_at,units(id,code)))")
    .eq("student_id", learnerId)
    .is("archived_at", null);
  const candidates = (data ?? []).flatMap(enrolment => {
    const classRecord = related(enrolment.classes);
    if (!classRecord?.published) return [];
    const unit = (classRecord.class_units ?? []).flatMap(assignment => {
      const linkedUnit = related(assignment.units);
      return assignment.active && !assignment.archived_at && linkedUnit?.code === unitCode ? [linkedUnit] : [];
    })[0];
    return unit ? [{ classId: String(classRecord.id), unitId: String(unit.id) }] : [];
  });
  for (const candidate of candidates) {
    const { data: positions } = await supabase.rpc("current_class_learning_journey", { class_uuid: candidate.classId });
    const position = positions?.find((row: { unit_id: string }) => row.unit_id === candidate.unitId);
    if (position) return {
      classId: candidate.classId,
      teachingWeek: Number(position.teaching_week),
      totalTeachingWeeks: Number(position.total_teaching_weeks),
      status: String(position.position_status),
    };
  }
  return null;
}

function related<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

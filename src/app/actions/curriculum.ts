"use server";

import { z } from "zod";
import { getSessionProfile } from "@/lib/auth";
import { configuredUnits, type ExpertiseLevel } from "@/lib/learning-catalog";
import { createClient } from "@/lib/supabase/server";
import { hasAssignedCurriculumUnit } from "@/lib/curriculum-access";
import { isConfiguredUnitCode } from "@/lib/curriculum-unit-code";
import { gradeStartingPointResponses } from "@/lib/starting-point-grading";
import { createAdminClient } from "@/lib/supabase/admin";
import { curriculumPositionSection } from "@/lib/curriculum-position";
import { revalidatePath } from "next/cache";

const configuredUnitCodeSchema = z.string().refine(isConfiguredUnitCode);

const startingPointSchema = z.object({
  unitCode: configuredUnitCodeSchema,
  background: z.object({
    experience: z.string().trim().max(2000).optional(),
    supportNeeds: z.string().trim().max(2000).optional(),
  }),
  responses: z.array(z.object({
    questionId: z.string().trim().min(1).max(160),
    selectedOption: z.number().int().min(0).max(20),
  })).min(1).max(300),
});

const positionSchema = z.object({
  unitCode: configuredUnitCodeSchema,
  topicCode: z.string().min(1).max(20),
  currentSection: z.string().trim().min(1).max(80),
});

export async function saveCurriculumProgress(input: {
  unitCode: string;
  topicCode: string;
  currentSection: string;
}): Promise<{ ok: boolean; message: string }> {
  const actor = await getSessionProfile();
  if (!actor || actor.role !== "student") return { ok: false, message: "Sign in as a student to sync progress." };
  const parsed = positionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "The lesson position was invalid." };
  const unit = configuredUnits.find(item => item.code === parsed.data.unitCode);
  const topic = unit?.topics.find(item => item.code === parsed.data.topicCode);
  if (!unit || !topic) return { ok: false, message: "This topic is not part of the configured curriculum." };
  if (!await hasAssignedCurriculumUnit(parsed.data.unitCode)) return { ok: false, message: "This unit is not assigned to your student group." };
  const admin = createAdminClient();
  const { data: existing } = await admin.from("learner_curriculum_progress")
    .select("selected_level,topic_started_at")
    .eq("learner_id", actor.id)
    .eq("unit_code", unit.code)
    .eq("topic_code", topic.code)
    .maybeSingle();
  const currentSection = curriculumPositionSection(unit, topic, parsed.data.currentSection, existing?.selected_level);
  if (!currentSection) return { ok: false, message: "That lesson position is not part of this topic." };
  const now = new Date().toISOString();
  const { error } = existing
    ? await admin.from("learner_curriculum_progress").update({
      current_section: currentSection,
      topic_started_at: existing.topic_started_at ?? now,
    }).eq("learner_id", actor.id).eq("unit_code", unit.code).eq("topic_code", topic.code)
    : await admin.from("learner_curriculum_progress").insert({
      learner_id: actor.id,
      unit_code: unit.code,
      topic_code: topic.code,
      topic_started_at: now,
      current_section: currentSection,
    });
  if (error) return { ok: false, message: "Progress is saved on this device; account sync will resume when the curriculum migration is applied." };
  return { ok: true, message: "Lesson position synced to your learner account." };
}

export async function saveStartingPoint(input: {
  unitCode: string;
  background: { experience?: string; supportNeeds?: string };
  responses: { questionId: string; selectedOption: number }[];
}): Promise<{ ok: boolean; message: string; recommendedLevel?: ExpertiseLevel }> {
  const actor = await getSessionProfile();
  if (!actor || actor.role !== "student") return { ok: false, message: "Sign in as a student to sync the starting point." };
  const parsed = startingPointSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid starting-point record." };
  const unit = configuredUnits.find(item => item.code === parsed.data.unitCode);
  if (!unit) return { ok: false, message: "Invalid starting-point record." };
  if (!await hasAssignedCurriculumUnit(parsed.data.unitCode)) return { ok: false, message: "This unit is not assigned to your student group." };
  const grade = gradeStartingPointResponses(unit, parsed.data.responses, new Date().toISOString());
  if (!grade.ok) return { ok: false, message: "Complete every starting-point question once before saving." };
  const supabase = createAdminClient();
  const rows = unit.topics.map(topic => ({
    learner_id: actor.id, unit_code: unit.code, topic_code: topic.code, selected_level: grade.recommendedLevel,
    independent_attempts: 0,
    evidence: grade.evidence.filter(item => item.topicCode === topic.code),
  }));
  const [{ error }, { error: backgroundError }] = await Promise.all([
    supabase.from("learner_curriculum_progress").upsert(rows, { onConflict: "learner_id,unit_code,topic_code" }),
    supabase.from("learner_workbook_background").upsert({ learner_id: actor.id, experience: parsed.data.background.experience ?? null, support_needs: parsed.data.background.supportNeeds ?? null, updated_at: new Date().toISOString() }, { onConflict: "learner_id" }),
  ]);
  if (error || backgroundError) return { ok: false, message: "Starting point is saved on this device; account sync requires the adaptive workbook migrations." };
  return { ok: true, message: "Starting-point evidence graded and synced to your learner account.", recommendedLevel: grade.recommendedLevel };
}

export type CurriculumActionState = { ok?: boolean; message?: string };

export async function recordWorkbookTeacherDecision(_previous: CurriculumActionState, formData: FormData): Promise<CurriculumActionState> {
  void _previous;
  const actor = await getSessionProfile();
  if (!actor || !["teacher", "administrator"].includes(actor.role)) return { ok: false, message: "Teacher access is required." };
  const parsed = z.object({
    learnerId: z.string().uuid(), unitCode: configuredUnitCodeSchema, topicCode: z.string().max(20).optional(),
    decisionType: z.enum(["assign_topic","assign_mastery_check","assign_progress_point","route_override","project_unlock","feedback","intervention","reflection_review"]),
    originalRoute: z.string().max(80).optional(), newRoute: z.string().max(80).optional(), reason: z.string().min(10).max(1500), reviewOn: z.string().date().optional(),
  }).safeParse({
    learnerId: formData.get("learnerId"), unitCode: formData.get("unitCode"), topicCode: String(formData.get("topicCode") ?? "") || undefined,
    decisionType: formData.get("decisionType"), originalRoute: String(formData.get("originalRoute") ?? "") || undefined,
    newRoute: String(formData.get("newRoute") ?? "") || undefined, reason: formData.get("reason"), reviewOn: String(formData.get("reviewOn") ?? "") || undefined,
  });
  if (!parsed.success) return { ok: false, message: "Complete the decision, educational reason and review details." };
  if (["route_override","project_unlock"].includes(parsed.data.decisionType) && (!parsed.data.originalRoute || !parsed.data.newRoute)) return { ok: false, message: "Overrides require both the original and new route." };
  const unit = configuredUnits.find(item => item.code === parsed.data.unitCode);
  if (!unit || (parsed.data.topicCode && !unit.topics.some(item => item.code === parsed.data.topicCode))) return { ok: false, message: "Choose a configured unit and topic." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_record_workbook_decision", {
    learner_uuid: parsed.data.learnerId,
    unit_code_value: parsed.data.unitCode,
    topic_code_value: parsed.data.topicCode ?? null,
    decision_type_value: parsed.data.decisionType,
    original_route_value: parsed.data.originalRoute ?? null,
    new_route_value: parsed.data.newRoute ?? null,
    reason_value: parsed.data.reason,
    review_on_value: parsed.data.reviewOn ?? null,
  });
  if (error) {
    return { ok: false, message: "The decision could not be saved safely. Refresh the learner record and try again." };
  }
  revalidatePath(`/teacher/learners/${parsed.data.learnerId}`);
  return { ok: true, message: "Workbook decision recorded with teacher, timestamp and reason." };
}

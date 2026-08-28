"use server";

import { z } from "zod";
import { getSessionProfile } from "@/lib/auth";
import { configuredUnits, type ExpertiseLevel } from "@/lib/learning-catalog";
import type { TopicEvidence } from "@/lib/learning-progress";
import { createClient } from "@/lib/supabase/server";
import { hasAssignedCurriculumUnit } from "@/lib/curriculum-access";
import { isConfiguredUnitCode } from "@/lib/curriculum-unit-code";

const configuredUnitCodeSchema = z.string().refine(isConfiguredUnitCode);

const payloadSchema = z.object({
  unitCode: configuredUnitCodeSchema,
  topicCode: z.string().min(1).max(20),
  level: z.enum(["Support", "Core", "Stretch", "Challenge"]),
  evidence: z.object({
    startedAt: z.string().datetime().optional(),
    lessonCompletedAt: z.string().datetime().optional(),
    practiceScore: z.number().min(0).max(100).optional(),
    hintsUsed: z.number().int().min(0).optional(),
    masteryScore: z.number().min(0).max(100).optional(),
    masteredAt: z.string().datetime().optional(),
    currentSection: z.string().max(80).optional(),
    independentAttempts: z.number().int().min(0).optional(),
    retrievalDueAt: z.string().datetime().optional(),
    fastTrackReason: z.string().max(1000).optional(),
    evidence: z.array(z.object({
      id: z.string(), kind: z.enum(["initial_diagnostic","guided_practice","independent_practice","topic_mastery","progress_point","retrieval","unit_assessment","project"]),
      unitCode: z.string(), topicCode: z.string(), skill: z.string(), learningAim: z.string().optional(), criterion: z.string().optional(), difficulty: z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]), correct: z.boolean(), independent: z.boolean(), hintsUsed: z.number().int().min(0), misconception: z.string().optional(), feedback: z.string().optional(), recordedAt: z.string().datetime(),
    })).max(200).optional(),
  }),
});

export async function saveCurriculumProgress(input: {
  unitCode: string;
  topicCode: string;
  level: ExpertiseLevel;
  evidence: TopicEvidence;
}): Promise<{ ok: boolean; message: string }> {
  const actor = await getSessionProfile();
  if (!actor || actor.role !== "student") return { ok: false, message: "Sign in as a student to sync progress." };
  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "The curriculum progress record was invalid." };
  const unit = configuredUnits.find(item => item.code === parsed.data.unitCode);
  if (!unit?.topics.some(item => item.code === parsed.data.topicCode)) return { ok: false, message: "This topic is not part of the configured curriculum." };
  if (!await hasAssignedCurriculumUnit(parsed.data.unitCode)) return { ok: false, message: "This unit is not assigned to your student group." };
  const evidence = parsed.data.evidence;
  if (evidence.masteryScore != null && (!evidence.lessonCompletedAt || evidence.practiceScore == null || (evidence.independentAttempts ?? 0) < 3)) {
    return { ok: false, message: "Independent mastery requires completed teaching and practice." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("learner_curriculum_progress").upsert({
    learner_id: actor.id,
    unit_code: parsed.data.unitCode,
    topic_code: parsed.data.topicCode,
    selected_level: parsed.data.level,
    topic_started_at: evidence.startedAt ?? null,
    lesson_completed_at: evidence.lessonCompletedAt ?? null,
    practice_score: evidence.practiceScore ?? null,
    hints_used: evidence.hintsUsed ?? 0,
    mastery_score: evidence.masteryScore ?? null,
    mastered_at: evidence.masteredAt ?? null,
    current_section: evidence.currentSection ?? null,
    independent_attempts: evidence.independentAttempts ?? 0,
    retrieval_due_at: evidence.retrievalDueAt ?? null,
    fast_track_reason: evidence.fastTrackReason ?? null,
    evidence: evidence.evidence ?? [],
  }, { onConflict: "learner_id,unit_code,topic_code" });
  if (error) return { ok: false, message: "Progress is saved on this device; account sync will resume when the curriculum migration is applied." };
  return { ok: true, message: "Progress synced to your learner account." };
}

export async function saveStartingPoint(input: { unitCode: string; level: ExpertiseLevel; background: { experience?: string; supportNeeds?: string }; evidence: import("@/lib/adaptive-workbook").SkillEvidence[] }): Promise<{ ok: boolean; message: string }> {
  const actor = await getSessionProfile();
  if (!actor || actor.role !== "student") return { ok: false, message: "Sign in as a student to sync the starting point." };
  const unit = configuredUnits.find(item => item.code === input.unitCode);
  if (!unit || !["Support","Core","Stretch","Challenge"].includes(input.level)) return { ok: false, message: "Invalid starting-point record." };
  if (!await hasAssignedCurriculumUnit(input.unitCode)) return { ok: false, message: "This unit is not assigned to your student group." };
  const supabase = await createClient();
  const rows = unit.topics.map(topic => ({
    learner_id: actor.id, unit_code: unit.code, topic_code: topic.code, selected_level: input.level,
    independent_attempts: 0,
    evidence: input.evidence.filter(item => item.topicCode === topic.code),
  }));
  const [{ error }, { error: backgroundError }] = await Promise.all([
    supabase.from("learner_curriculum_progress").upsert(rows, { onConflict: "learner_id,unit_code,topic_code" }),
    supabase.from("learner_workbook_background").upsert({ learner_id: actor.id, experience: input.background.experience ?? null, support_needs: input.background.supportNeeds ?? null, updated_at: new Date().toISOString() }, { onConflict: "learner_id" }),
  ]);
  if (error || backgroundError) return { ok: false, message: "Starting point is saved on this device; account sync requires the adaptive workbook migrations." };
  return { ok: true, message: "Starting-point evidence synced to your learner account." };
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
  const { error } = await supabase.from("workbook_teacher_decisions").insert({
    learner_id: parsed.data.learnerId, teacher_id: actor.id, unit_code: parsed.data.unitCode, topic_code: parsed.data.topicCode ?? null,
    decision_type: parsed.data.decisionType, original_route: parsed.data.originalRoute ?? null, new_route: parsed.data.newRoute ?? null,
    reason: parsed.data.reason, review_on: parsed.data.reviewOn ?? null,
  });
  return error ? { ok: false, message: "The decision could not be saved. Apply the adaptive workbook migration first." } : { ok: true, message: "Workbook decision recorded with teacher, timestamp and reason." };
}

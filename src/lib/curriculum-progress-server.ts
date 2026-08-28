import "server-only";
import { getSessionProfile } from "./auth";
import type { ExpertiseLevel } from "./learning-catalog";
import { latestIncompleteCurriculumPosition, topicKey, type LearningProgress } from "./learning-progress";
import { createClient } from "./supabase/server";

export async function loadCurriculumProgress(): Promise<LearningProgress | null> {
  const actor = await getSessionProfile();
  if (!actor || actor.role !== "student") return null;
  const supabase = await createClient();
  const [{ data, error }, { data: existingMastery }, { data: startingEvidence }, { data: projectUnlocks }, { data: background }] = await Promise.all([
    supabase.from("learner_curriculum_progress")
      .select("unit_code,topic_code,selected_level,topic_started_at,lesson_completed_at,practice_score,hints_used,mastery_score,mastered_at,current_section,independent_attempts,retrieval_due_at,fast_track_reason,evidence,updated_at")
      .eq("learner_id", actor.id).order("updated_at",{ascending:false}),
    supabase.from("skill_mastery").select("current_pathway,mastery_score")
      .eq("learner_id", actor.id).order("mastery_score").limit(1),
    supabase.from("assessment_skill_results")
      .select("percentage,assessment_instances!inner(learner_id,kind)")
      .eq("assessment_instances.learner_id", actor.id)
      .in("assessment_instances.kind", ["course_starting_point", "unit_starting_point"]),
    supabase.from("workbook_teacher_decisions").select("unit_code,reason,created_at,teachers:teacher_id(display_name)")
      .eq("learner_id", actor.id).eq("decision_type", "project_unlock").order("created_at", { ascending: false }),
    supabase.from("learner_workbook_background").select("experience,support_needs").eq("learner_id", actor.id).maybeSingle(),
  ]);
  const pathway = existingMastery?.[0]?.current_pathway;
  const startingPercentages = (startingEvidence ?? []).map(item => Number(item.percentage));
  const startingScore = startingPercentages.length
    ? startingPercentages.reduce((sum, score) => sum + score, 0) / startingPercentages.length
    : null;
  const progress: LearningProgress = {
    topics: {},
    projectUnlocks: Object.fromEntries((projectUnlocks ?? []).map(item => [item.unit_code, { reason: item.reason, teacher: "Teacher", recordedAt: item.created_at }])),
    background: background ? { experience: background.experience ?? undefined, supportNeeds: background.support_needs ?? undefined } : undefined,
    recommendedLevel: startingScore != null
      ? startingScore >= 85 ? "Challenge" : startingScore >= 70 ? "Stretch" : startingScore >= 50 ? "Core" : "Support"
      : pathway === "Mastery" ? "Challenge"
        : pathway === "Stretch" ? "Stretch" : pathway === "Core" ? "Core"
        : "Support",
  };
  if (error || !data) return progress;
  progress.currentPosition=latestIncompleteCurriculumPosition(data);
  for (const row of data) {
    if (row.selected_level) progress.level = row.selected_level as ExpertiseLevel;
    const mappedEvidence = Array.isArray(row.evidence) ? row.evidence as never[] : [];
    if (mappedEvidence.some((item: { kind?: string }) => item.kind === "initial_diagnostic")) progress.diagnosticCompletedAt ??= row.topic_started_at ?? new Date(0).toISOString();
    progress.topics[topicKey(row.unit_code, row.topic_code)] = {
      startedAt: row.topic_started_at ?? undefined,
      lessonCompletedAt: row.lesson_completed_at ?? undefined,
      practiceScore: row.practice_score == null ? undefined : Number(row.practice_score),
      hintsUsed: row.hints_used,
      masteryScore: row.mastery_score == null ? undefined : Number(row.mastery_score),
      masteredAt: row.mastered_at ?? undefined,
      currentSection: row.current_section ?? undefined,
      independentAttempts: row.independent_attempts ?? 0,
      retrievalDueAt: row.retrieval_due_at ?? undefined,
      fastTrackReason: row.fast_track_reason ?? undefined,
      evidence: mappedEvidence,
    };
  }
  return progress;
}

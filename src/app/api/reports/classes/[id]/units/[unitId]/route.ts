import { z } from "zod";
import { getSessionProfile } from "@/lib/auth";
import { canViewLearnerEvidence } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  classUnitReportCsv,
  projectClassUnitReport,
  type UnitAttemptEvidence,
  type UnitComparisonEvidence,
  type UnitDecisionEvidence,
  type UnitProgressEvidence,
  type UnitTargetEvidence,
} from "@/lib/class-unit-report";
import { buildClassUnitReportPdf } from "@/lib/class-unit-report-pdf";

type Row = Record<string, unknown>;
const paramsSchema = z.object({ id: z.string().uuid(), unitId: z.string().uuid() });

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; unitId: string }> },
) {
  const actor = await getSessionProfile();
  if (!actor) return privateResponse("Authentication required.", 401);
  if (!canViewLearnerEvidence(actor.role)) return privateResponse("Not authorised.", 403);
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return privateResponse("Report scope not found.", 404);
  const { id, unitId } = parsed.data;
  const supabase = await createClient();

  const [{ data: classData }, { data: unitLink }] = await Promise.all([
    supabase.from("classes").select(
      "id,name,courses(title),enrolments(student_id,archived_at,user_profiles!enrolments_student_id_fkey(display_name))",
    ).eq("id", id).is("archived_at", null).single(),
    supabase.from("class_units").select(
      "unit_id,active,archived_at,units!inner(id,code,title)",
    ).eq("class_id", id).eq("unit_id", unitId).eq("active", true).is("archived_at", null).maybeSingle(),
  ]);
  if (!classData || !unitLink) return privateResponse("Class unit not found or not authorised.", 404);
  const unit = related(unitLink.units);
  if (!unit) return privateResponse("Class unit not found or not authorised.", 404);
  const unitCode = String(unit.code);

  const [topicResult, journeyResult, positionResult] = await Promise.all([
    supabase.from("topics").select("id,code,title,sort_order")
      .eq("unit_id", unitId).eq("status", "approved").is("archived_at", null).order("sort_order"),
    supabase.from("group_learning_journeys").select(
      "status,started_on,completed_at,templates:template_id(title,total_teaching_weeks)",
    ).eq("class_id", id).eq("unit_id", unitId).is("archived_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc("current_class_learning_journey", { class_uuid: id }),
  ]);
  if (topicResult.error || journeyResult.error || positionResult.error) {
    return privateResponse("The unit evidence report could not be generated.", 500);
  }
  const topicRows = topicResult.data;
  const latestJourney = journeyResult.data;
  const journeyPositions = positionResult.data;
  const activeEnrolments = (classData.enrolments ?? []).filter(enrolment => !enrolment.archived_at);
  const learnerIds = activeEnrolments.map(enrolment => enrolment.student_id);
  const topics = (topicRows ?? []).map(topic => ({ id: topic.id, code: topic.code, title: topic.title }));
  const topicIds = new Set(topics.map(topic => topic.id));

  const evidenceResults = learnerIds.length
    ? await Promise.all([
      supabase.from("learner_curriculum_progress").select(
        "learner_id,topic_code,topic_started_at,lesson_completed_at,current_section,practice_score,mastery_score,independent_attempts,mastered_at,evidence,updated_at",
      ).in("learner_id", learnerIds).eq("unit_code", unitCode).limit(5000),
      supabase.from("learner_curriculum_attempts").select(
        "id,learner_id,kind,topic_code,paper_mode,percentage,hints_used,completed_at,teacher_feedback",
      ).in("learner_id", learnerIds).eq("unit_code", unitCode).order("completed_at").limit(5000),
      supabase.from("skill_progress_comparisons").select(
        "learner_id,starting_percentage,latest_percentage,improvement_points,evidence,skills(id,title,topic_id),progress_result:latest_progress_result_id(created_at,assessment_instances(completed_at))",
      ).in("learner_id", learnerIds).limit(5000),
      supabase.from("targets").select(
        "learner_id,unit_id,topic_id,status,target_text,target_date,next_action",
      ).in("learner_id", learnerIds).is("archived_at", null).order("target_date").limit(5000),
      supabase.from("workbook_teacher_decisions").select(
        "learner_id,topic_code,decision_type,reason,review_on,created_at",
      ).in("learner_id", learnerIds).eq("unit_code", unitCode).order("created_at").limit(5000),
      supabase.from("learner_portfolio_artifacts").select("learner_id")
        .in("learner_id", learnerIds).eq("unit_code", unitCode).limit(5000),
      supabase.from("learner_topic_worksheets").select("learner_id")
        .in("learner_id", learnerIds).eq("unit_code", unitCode).limit(5000),
      supabase.from("learner_catch_up_records").select("learner_id,topic_code,completed_at")
        .in("learner_id", learnerIds).eq("unit_code", unitCode).limit(5000),
    ])
    : emptyEvidenceQueries();
  if (evidenceResults.some(result => result.error)) {
    return privateResponse("The unit evidence report could not be generated.", 500);
  }
  const [progressRows, attemptRows, comparisonRows, targetRows, decisionRows, artifactRows, worksheetRows, catchUpRows] = evidenceResults;

  const comparisons: UnitComparisonEvidence[] = rows(comparisonRows.data)
    .filter(row => topicIds.has(String(related(row.skills)?.topic_id ?? "")))
    .map(row => ({
      learnerId: String(row.learner_id),
      startingPercentage: Number(row.starting_percentage),
      latestPercentage: nullableNumber(row.latest_percentage),
      improvementPoints: nullableNumber(row.improvement_points),
      evidence: row.evidence,
      progressDate: progressDate(row.progress_result),
    }));
  const targets: UnitTargetEvidence[] = rows(targetRows.data)
    .filter(row => row.unit_id === unitId || topicIds.has(String(row.topic_id ?? "")))
    .map(row => ({
      learnerId: String(row.learner_id), status: String(row.status), targetText: String(row.target_text),
      targetDate: String(row.target_date), nextAction: stringOrNull(row.next_action),
    }));
  const activeJourney = rows(journeyPositions).find(row => row.unit_id === unitId);
  const journeyTemplate = related(latestJourney?.templates);
  const report = projectClassUnitReport({
    className: classData.name,
    courseTitle: String(related(classData.courses)?.title ?? "Course not recorded"),
    unitId,
    unitCode,
    unitTitle: String(unit.title),
    generatedAt: new Date().toISOString(),
    journey: latestJourney ? {
      title: String(activeJourney?.journey_title ?? journeyTemplate?.title ?? "Shared learning journey"),
      status: String(activeJourney?.position_status ?? latestJourney.status).replaceAll("_", " "),
      teachingWeek: activeJourney ? Number(activeJourney.teaching_week) : null,
      totalTeachingWeeks: activeJourney ? Number(activeJourney.total_teaching_weeks) : nullableNumber(journeyTemplate?.total_teaching_weeks),
      startedOn: stringOrNull(latestJourney.started_on),
    } : null,
    learners: activeEnrolments.map(enrolment => ({
      id: enrolment.student_id,
      name: String(related(enrolment.user_profiles)?.display_name ?? "Learner"),
    })),
    topics,
    progress: rows(progressRows.data).map(mapProgress),
    attempts: rows(attemptRows.data).map(mapAttempt),
    comparisons,
    targets,
    decisions: rows(decisionRows.data).map(mapDecision),
    artifacts: rows(artifactRows.data).map(row => ({ learnerId: String(row.learner_id) })),
    worksheets: rows(worksheetRows.data).map(row => ({ learnerId: String(row.learner_id) })),
    catchUp: rows(catchUpRows.data).map(row => ({
      learnerId: String(row.learner_id), topicCode: String(row.topic_code), completedAt: stringOrNull(row.completed_at),
    })),
  });

  const format = new URL(request.url).searchParams.get("format");
  const safeName = `${classData.name}-unit-${unitCode}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  if (format === "csv") {
    return new Response(classUnitReportCsv(report), {
      headers: downloadHeaders("text/csv; charset=utf-8", `${safeName}-evidence.csv`),
    });
  }
  const bytes = await buildClassUnitReportPdf(report);
  return new Response(bytes as BodyInit, {
    headers: downloadHeaders("application/pdf", `${safeName}-evidence.pdf`),
  });
}

function mapProgress(row: Row): UnitProgressEvidence {
  return {
    learnerId: String(row.learner_id), topicCode: String(row.topic_code),
    topicStartedAt: stringOrNull(row.topic_started_at), lessonCompletedAt: stringOrNull(row.lesson_completed_at),
    currentSection: stringOrNull(row.current_section), practiceScore: nullableNumber(row.practice_score),
    masteryScore: nullableNumber(row.mastery_score), independentAttempts: Number(row.independent_attempts ?? 0),
    masteredAt: stringOrNull(row.mastered_at), evidence: row.evidence, updatedAt: String(row.updated_at),
  };
}

function mapAttempt(row: Row): UnitAttemptEvidence {
  return {
    id: String(row.id), learnerId: String(row.learner_id), kind: String(row.kind),
    topicCode: stringOrNull(row.topic_code), paperMode: stringOrNull(row.paper_mode),
    percentage: Number(row.percentage), hintsUsed: Number(row.hints_used ?? 0),
    completedAt: String(row.completed_at), teacherFeedback: stringOrNull(row.teacher_feedback),
  };
}

function mapDecision(row: Row): UnitDecisionEvidence {
  return {
    learnerId: String(row.learner_id), topicCode: stringOrNull(row.topic_code),
    decisionType: String(row.decision_type), reason: String(row.reason),
    reviewOn: stringOrNull(row.review_on), createdAt: String(row.created_at),
  };
}

function emptyEvidenceQueries() {
  const empty = (): { data: Row[]; error: null } => ({ data: [], error: null });
  return [empty(), empty(), empty(), empty(), empty(), empty(), empty(), empty()] as const;
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value as Row[] : [];
}

function related(value: unknown): Row | undefined {
  return Array.isArray(value) ? value[0] as Row | undefined : value && typeof value === "object" ? value as Row : undefined;
}

function progressDate(value: unknown) {
  const result = related(value);
  return stringOrNull(related(result?.assessment_instances)?.completed_at) ?? stringOrNull(result?.created_at);
}

function nullableNumber(value: unknown) {
  return value == null ? null : Number(value);
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function privateResponse(message: string, status: number) {
  return new Response(message, { status, headers: { "cache-control": "private, no-store" } });
}

function downloadHeaders(contentType: string, filename: string) {
  return {
    "content-type": contentType,
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  };
}

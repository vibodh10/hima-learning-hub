import { z } from "zod";
import { getSessionProfile } from "@/lib/auth";
import { buildClassReportPdf } from "@/lib/class-report-pdf";
import {
  classReportCsv,
  projectClassReport,
  type ClassReportAllocation,
  type ClassReportAttempt,
  type ClassReportComparison,
} from "@/lib/class-report-model";
import { canViewLearnerEvidence } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

type Row = Record<string, unknown>;
const paramsSchema = z.object({ id: z.string().uuid() });
const QUERY_LIMIT = 5000;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getSessionProfile();
  if (!actor) return privateResponse("Authentication required.", 401);
  if (!canViewLearnerEvidence(actor.role)) return privateResponse("Not authorised.", 403);
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return privateResponse("Class report not found.", 404);
  const { id } = parsed.data;
  const supabase = await createClient();

  const classResult = await supabase.from("classes").select(
    "id,name,courses(title),units:class_units(unit_id,active,archived_at,units(id,code,title,archived_at)),enrolments(student_id,archived_at,user_profiles!enrolments_student_id_fkey(display_name))",
  ).eq("id", id).is("archived_at", null).single();
  if (classResult.error || !classResult.data) {
    return privateResponse("Class not found or not authorised.", 404);
  }
  const classData = classResult.data;
  const activeEnrolments = rows(classData.enrolments).filter(enrolment => !enrolment.archived_at);
  const learners = activeEnrolments.map(enrolment => ({
    id: String(enrolment.student_id),
    name: String(related(enrolment.user_profiles)?.display_name ?? "Learner"),
  }));
  const learnerIds = learners.map(learner => learner.id);
  const selectedUnits = rows(classData.units).flatMap(link => {
    const unit = related(link.units);
    return link.active === true && !link.archived_at && unit && !unit.archived_at
      ? [{ id: String(unit.id), code: String(unit.code), title: String(unit.title) }]
      : [];
  });
  const unitIds = new Set(selectedUnits.map(unit => unit.id));

  const [topicResult, actionResult] = await Promise.all([
    selectedUnits.length
      ? supabase.from("topics").select("id,unit_id").in("unit_id", [...unitIds])
        .eq("status", "approved").is("archived_at", null).limit(QUERY_LIMIT)
      : emptyResult(),
    supabase.from("teacher_actions").select("learner_id,action,reason,created_at")
      .eq("class_id", id).is("archived_at", null).order("created_at", { ascending: false }).limit(QUERY_LIMIT),
  ]);
  if (topicResult.error || actionResult.error) {
    return privateResponse("The class evidence report could not be generated.", 500);
  }
  if (reachedQueryLimit(topicResult.data) || reachedQueryLimit(actionResult.data)) {
    return privateResponse("The class evidence report is too large to export safely. Use a unit report instead.", 409);
  }
  const topicIds = new Set(rows(topicResult.data).map(topic => String(topic.id)));

  const evidenceResults = learnerIds.length && topicIds.size
    ? await Promise.all([
      supabase.from("skill_progress_comparisons").select(
        "learner_id,starting_percentage,latest_percentage,improvement_points,evidence,skills(topic_id),progress_result:latest_progress_result_id(created_at,assessment_instances(completed_at))",
      ).in("learner_id", learnerIds).limit(QUERY_LIMIT),
      supabase.from("skill_mastery").select("learner_id,current_pathway,skills(topic_id)")
        .in("learner_id", learnerIds).limit(QUERY_LIMIT),
      supabase.from("learner_misconceptions").select(
        "learner_id,occurrence_count,misconceptions(title,skills(topic_id))",
      ).in("learner_id", learnerIds).limit(QUERY_LIMIT),
      supabase.from("activity_allocations").select(
        "id,learner_id,activity_id,release_at,deadline_at,required,class_scope_source,activities(lessons(topics(unit_id)))",
      ).eq("class_id", id).is("archived_at", null).limit(QUERY_LIMIT),
    ])
    : [emptyResult(), emptyResult(), emptyResult(), emptyResult()] as const;
  if (evidenceResults.some(result => result.error)) {
    return privateResponse("The class evidence report could not be generated.", 500);
  }
  if (evidenceResults.some(result => reachedQueryLimit(result.data))) {
    return privateResponse("The class evidence report is too large to export safely. Use a unit report instead.", 409);
  }
  const [comparisonResult, masteryResult, misconceptionResult, classAllocationResult] = evidenceResults;
  const allocationRows = rows(classAllocationResult.data)
    .filter(allocation => unitIds.has(activityUnitId(allocation.activities)));
  const activityIds = [...new Set(allocationRows.map(allocation => String(allocation.activity_id)))];
  const attemptResult = learnerIds.length && activityIds.length
    ? await supabase.from("attempts").select("learner_id,activity_id,allocation_id,completed_at")
      .in("learner_id", learnerIds).in("activity_id", activityIds)
      .not("completed_at", "is", null).limit(QUERY_LIMIT)
    : emptyResult();
  if (attemptResult.error) {
    return privateResponse("The class evidence report could not be generated.", 500);
  }
  if (reachedQueryLimit(attemptResult.data)) {
    return privateResponse("The class evidence report is too large to export safely. Use a unit report instead.", 409);
  }

  const report = projectClassReport({
    className: String(classData.name),
    courseTitle: String(related(classData.courses)?.title ?? "Course not recorded"),
    units: selectedUnits.map(unit => `${unit.code}: ${unit.title}`),
    generatedAt: new Date().toISOString(),
    learners,
    comparisons: rows(comparisonResult.data)
      .filter(row => topicIds.has(String(related(row.skills)?.topic_id ?? "")))
      .map(mapComparison),
    mastery: rows(masteryResult.data)
      .filter(row => topicIds.has(String(related(row.skills)?.topic_id ?? "")))
      .map(row => ({ learnerId: String(row.learner_id), currentPathway: String(row.current_pathway) })),
    allocations: allocationRows.map(mapAllocation),
    attempts: rows(attemptResult.data).map(mapAttempt),
    misconceptions: rows(misconceptionResult.data).flatMap(row => {
      const misconception = related(row.misconceptions);
      return topicIds.has(String(related(misconception?.skills)?.topic_id ?? ""))
        ? [{
          learnerId: String(row.learner_id),
          title: String(misconception?.title ?? "Misconception not labelled"),
          occurrenceCount: Number(row.occurrence_count ?? 0),
        }]
        : [];
    }),
    actions: rows(actionResult.data)
      .filter(row => row.learner_id == null || learnerIds.includes(String(row.learner_id)))
      .map(row => ({
        action: String(row.action), reason: String(row.reason), createdAt: String(row.created_at),
      })),
  });

  const safeName = String(classData.name).replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "").toLowerCase() || "class";
  if (new URL(request.url).searchParams.get("format") === "csv") {
    return new Response(classReportCsv(report), {
      headers: downloadHeaders("text/csv; charset=utf-8", `${safeName}-class-evidence.csv`),
    });
  }
  const bytes = await buildClassReportPdf(report);
  return new Response(bytes as BodyInit, {
    headers: downloadHeaders("application/pdf", `${safeName}-class-evidence.pdf`),
  });
}

function mapComparison(row: Row): ClassReportComparison {
  return {
    learnerId: String(row.learner_id),
    startingPercentage: Number(row.starting_percentage),
    latestPercentage: nullableNumber(row.latest_percentage),
    improvementPoints: nullableNumber(row.improvement_points),
    evidence: row.evidence,
    progressDate: progressDate(row.progress_result),
  };
}

function mapAllocation(row: Row): ClassReportAllocation {
  return {
    id: String(row.id), learnerId: stringOrNull(row.learner_id),
    activityId: String(row.activity_id), releaseAt: stringOrNull(row.release_at),
    deadlineAt: stringOrNull(row.deadline_at), required: row.required === true,
    classScopeSource: stringOrNull(row.class_scope_source),
  };
}

function mapAttempt(row: Row): ClassReportAttempt {
  return {
    learnerId: String(row.learner_id), activityId: String(row.activity_id),
    allocationId: stringOrNull(row.allocation_id), completedAt: String(row.completed_at),
  };
}

function activityUnitId(value: unknown) {
  const activity = related(value);
  const lesson = related(activity?.lessons);
  return String(related(lesson?.topics)?.unit_id ?? "");
}

function progressDate(value: unknown) {
  const result = related(value);
  return stringOrNull(related(result?.assessment_instances)?.completed_at) ?? stringOrNull(result?.created_at);
}

function emptyResult(): { data: Row[]; error: null } {
  return { data: [], error: null };
}

function reachedQueryLimit(value: unknown) {
  return Array.isArray(value) && value.length >= QUERY_LIMIT;
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value as Row[] : [];
}

function related(value: unknown): Row | undefined {
  return Array.isArray(value) ? value[0] as Row | undefined : value && typeof value === "object" ? value as Row : undefined;
}

function nullableNumber(value: unknown) {
  return value == null ? null : Number(value);
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function privateResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}

function downloadHeaders(contentType: string, filename: string) {
  return {
    "content-type": contentType,
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  };
}

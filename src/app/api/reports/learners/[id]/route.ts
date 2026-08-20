import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canViewLearnerEvidence } from "@/lib/permissions";
import { learnerJourneyCsv, type LearnerJourneyCsvRow } from "@/lib/report";
import { buildConciseLearnerReportPdf } from "@/lib/concise-learner-report-pdf";
import {
  academicEvidenceLabel, conciseCurrentJudgement, evidenceCounts, groupByTopic, hasValidComparableProgress,
  isPriorExperienceSkill, reportTargetStatus,
} from "@/lib/learner-report-model";

type Row = Record<string, unknown>;

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getSessionProfile();
  if (!actor) return new Response("Authentication required.", { status: 401 });
  if (!canViewLearnerEvidence(actor.role)) return new Response("Not authorised.", { status: 403 });
  const { id } = await context.params;
  const supabase = await createClient();
  const [
    { data: learner }, { data: enrolment }, { data: attempts }, { data: targets },
    { data: comparisons }, { data: mastery }, { data: feedback }, { data: misconceptions },
    { data: teacherActions }, { data: snapshots }, { data: retrieval }, { data: badges },
    { data: coins }, { data: assessments }, { data: overrides }, { data: curriculumAttempts },
  ] = await Promise.all([
    supabase.from("user_profiles").select("id,display_name").eq("id", id).eq("role", "student").single(),
    supabase.from("enrolments").select("enrolled_at,classes(id,name,course_id,courses(id,title),teachers:teacher_id(display_name))").eq("student_id", id).is("archived_at", null).limit(1).maybeSingle(),
    supabase.from("attempts").select("id,activity_id,percentage,attempt_number,completed_at,pathway,hints_used,teacher_override_by,teacher_override_reason,activities(title,learning_stage,assessment_kind,lessons(topics(id,title,units(id,code,title))))").eq("learner_id", id).not("completed_at", "is", null).order("completed_at"),
    supabase.from("targets").select("id,target_text,status,starts_on,target_date,review_on,reason,evidence,success_measure,current_progress,review_result,final_outcome,next_action,approved_by,units(code,title),topics(id,title,units(id,code,title)),skills(id,title),activities:linked_activity_id(title),teachers:approved_by(display_name)").eq("learner_id", id).is("archived_at", null).order("target_date"),
    supabase.from("skill_progress_comparisons").select("skill_id,starting_percentage,latest_percentage,improvement_points,status,evidence,skills(id,title,topics(id,title,units(id,code,title))),starting_result:starting_result_id(hints_used,difficulty,created_at,assessment_instances(completed_at,activities(title))),progress_result:latest_progress_result_id(hints_used,difficulty,created_at,assessment_instances(completed_at,activities(title)))").eq("learner_id", id),
    supabase.from("skill_mastery").select("skill_id,mastery_score,current_pathway,attempts_count,hints_used,repeated_error_count,retrieval_score,skills(id,title,topics(id,title,units(id,code,title)))").eq("learner_id", id),
    supabase.from("formative_response_reviews").select("id,status,feedback,reviewed_mark,reviewed_at,reviewed_by,attempt_answers(answer,mark,max_mark,feedback,answered_at,attempts(id,activity_id,percentage,attempt_number,completed_at,hints_used,activities(title,lessons(topics(id,title,units(id,code,title))))),questions(question_text,skills(id,title,topics(id,title,units(id,code,title)))))").eq("learner_id", id).order("created_at"),
    supabase.from("learner_misconceptions").select("occurrence_count,first_seen_at,last_seen_at,resolved_at,misconceptions(title,reteach_guidance,skills(id,title,topics(id,title,units(id,code,title))))").eq("learner_id", id).order("occurrence_count", { ascending: false }),
    supabase.from("teacher_actions").select("id,action,reason,review_on,outcome,metadata,created_at").eq("learner_id", id).is("archived_at", null).order("created_at"),
    supabase.from("progress_snapshots").select("id,created_at,learner_reflection,next_priorities,snapshot_data,academic_periods(name),creators:created_by(display_name)").eq("learner_id", id).order("created_at"),
    supabase.from("retrieval_schedules").select("id,scheduled_for,status,completed_at,topics(id,title,units(id,code,title)))").eq("learner_id", id).order("scheduled_for"),
    supabase.from("badge_awards").select("id,reason,awarded_at,badge_definitions(title)").eq("learner_id", id).order("awarded_at"),
    supabase.from("coin_transactions").select("id,amount,description,created_at,transaction_status").eq("learner_id", id).order("created_at"),
    supabase.from("assessment_instances").select("id,kind,completed_at,prior_experience,support_needs,aspirations,activities(title,lessons(topics(id,title,units(id,code,title))))").eq("learner_id", id).order("completed_at"),
    supabase.from("activity_unlock_overrides").select("id,reason,expires_at,created_at,revoked_at,activities(title,lessons(topics(id,title,units(id,code,title)))),teachers:teacher_id(display_name)").eq("learner_id", id).order("created_at"),
    supabase.from("learner_curriculum_attempts").select("id,kind,unit_code,topic_code,paper_mode,selected_level,percentage,mark,max_mark,hints_used,active_seconds,question_results,completed_at,teacher_mark,teacher_feedback,reviewed_at").eq("learner_id",id).order("completed_at",{ascending:false}).limit(200),
  ]);
  if (!learner) return new Response("Learner not found or not authorised.", { status: 404 });

  const enrolmentRow = enrolment as unknown as Row | null;
  const classInfo = related(enrolmentRow?.classes);
  const course = related(classInfo?.courses);
  const courseId = String(classInfo?.course_id ?? "");
  const { data: curriculumSkills } = courseId ? await supabase.from("skills")
    .select("id,title,sort_order,topics!inner(id,title,units!inner(id,code,title,course_id))")
    .eq("status", "approved").is("archived_at", null)
    .eq("topics.units.course_id", courseId).order("sort_order") : { data: [] };

  const evidence: ReportEvidence = {
    learnerName: learner.display_name,
    className: String(classInfo?.name ?? "No active class recorded"),
    courseTitle: String(course?.title ?? "No active course recorded"),
    teacherName: actor.display_name,
    enrolledAt: stringOrNull(enrolmentRow?.enrolled_at),
    exportedAt: new Date().toISOString(),
    skills: rows(curriculumSkills),
    comparisons: rows(comparisons),
    mastery: rows(mastery),
    attempts: rows(attempts),
    targets: rows(targets),
    feedback: rows(feedback),
    misconceptions: rows(misconceptions),
    teacherActions: rows(teacherActions),
    snapshots: rows(snapshots),
    retrieval: rows(retrieval),
    badges: rows(badges),
    coins: rows(coins),
    assessments: rows(assessments),
    overrides: rows(overrides),
    curriculumAttempts: rows(curriculumAttempts),
  };
  const safeName = learner.display_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  if (new URL(request.url).searchParams.get("format") === "csv") {
    const csv = learnerJourneyCsv({
      learnerName: evidence.learnerName,
      className: evidence.className,
      courseTitle: evidence.courseTitle,
      generatedAt: evidence.exportedAt,
      rows: buildCsvRows(evidence),
    });
    return new Response(csv, { headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${safeName}-progress-evidence.csv"`,
      "cache-control": "private, no-store",
    } });
  }
  const bytes = await buildConciseLearnerReportPdf(evidence);
  return new Response(bytes as BodyInit, { headers: {
    "content-type": "application/pdf",
    "content-disposition": `attachment; filename="${safeName}-learner-progress-evidence.pdf"`,
    "cache-control": "private, no-store",
  } });
}

export type ReportEvidence = {
  learnerName: string; className: string; courseTitle: string; teacherName: string;
  enrolledAt: string | null; exportedAt: string;
  skills: Row[]; comparisons: Row[]; mastery: Row[]; attempts: Row[];
  targets: Row[]; feedback: Row[]; misconceptions: Row[]; teacherActions: Row[];
  snapshots: Row[]; retrieval: Row[]; badges: Row[]; coins: Row[];
  assessments: Row[]; overrides: Row[]; curriculumAttempts: Row[];
};

function buildCsvRows(data: ReportEvidence): LearnerJourneyCsvRow[] {
  const academicSkills = data.skills.filter(skill => !isPriorExperienceSkill(String(skill.title ?? "")));
  const emittedTargetIds = new Set<string>();
  const result: LearnerJourneyCsvRow[] = academicSkills.map(skill => {
    const comparison = data.comparisons.find(item => item.skill_id === skill.id);
    const topic = related(skill.topics); const unit = related(topic?.units);
    const target = data.targets.find(item => related(item.skills)?.id === skill.id || related(item.topics)?.id === topic?.id);
    const review = feedbackForSkill(data.feedback, String(skill.id));
    const counts = evidenceCounts(comparison?.evidence);
    const valid = comparison ? hasValidComparableProgress({
      latestPercentage: nullableNumber(comparison.latest_percentage),
      improvementPoints: nullableNumber(comparison.improvement_points),
      evidence: comparison.evidence,
      progressDate: assessmentDate(comparison.progress_result),
    }) : false;
    const startingHints = Number(resultValue(comparison?.starting_result, "hints_used") ?? 0);
    const progressHints = Number(resultValue(comparison?.progress_result, "hints_used") ?? 0);
    const targetAlreadyShown = target ? emittedTargetIds.has(String(target.id)) : false;
    if (target) emittedTargetIds.add(String(target.id));
    return {
      unit: `${String(unit?.code ?? "Unit")} ${String(unit?.title ?? "not recorded")}`,
      topic: String(topic?.title ?? "Topic not recorded"),
      skill: String(skill.title ?? "Skill"),
      evidenceType: conciseCurrentJudgement({
        startingQuestionCount: counts.startingQuestionCount,
        startingSufficient: counts.startingSufficient,
        progressSufficient: counts.progressSufficient,
        validComparableProgress: valid,
        hintsUsed: progressHints,
        latestPercentage: nullableNumber(comparison?.latest_percentage),
      }),
      startingPointResult: counts.startingSufficient ? `${comparison?.starting_percentage}%` :
        counts.startingQuestionCount ? `Insufficient evidence (${counts.startingQuestionCount} question${counts.startingQuestionCount === 1 ? "" : "s"})` : "Not yet recorded",
      startingPointDate: formatDate(assessmentDate(comparison?.starting_result)),
      progressPointResult: valid ? `${comparison?.latest_percentage}%` : "Progress point not yet assessed.",
      progressPointDate: valid ? formatDate(assessmentDate(comparison?.progress_result)) : "Not yet recorded",
      supportOrHintsUsed: `Starting point: ${startingHints} hints; progress point: ${progressHints} hints`,
      change: valid ? `${signed(comparison?.improvement_points)} percentage points` : "Not calculable",
      feedback: String(review?.feedback ?? "Not yet recorded"),
      learnerAction: review?.status === "returned" ? "Returned for further practice" : "Not yet recorded",
      improvementAfterFeedback: followUpImprovement(review, data.attempts),
      target: target && !targetAlreadyShown ? String(target.target_text) : "",
      deadline: target && !targetAlreadyShown ? formatDate(stringOrNull(target.target_date)) : "",
      reviewDate: target && !targetAlreadyShown ? formatDate(stringOrNull(target.review_on)) : "",
      status: target && !targetAlreadyShown ? reportTargetStatus(String(target.status), String(target.target_date), new Date(data.exportedAt)) : "",
    };
  });
  data.comparisons.filter(item => isPriorExperienceSkill(String(related(item.skills)?.title ?? ""))).forEach(item => {
    const skill = related(item.skills); const topic = related(skill?.topics); const unit = related(topic?.units);
    result.push({
      unit: `${String(unit?.code ?? "Course")} ${String(unit?.title ?? "")}`.trim(),
      topic: String(topic?.title ?? "Learner background and prior experience"),
      skill: String(skill?.title ?? "Background item"),
      evidenceType: "Self-reported prior experience - excluded from academic mastery",
      startingPointResult: `${item.starting_percentage}% recorded response`,
      startingPointDate: formatDate(assessmentDate(item.starting_result)),
      progressPointResult: "Not applicable", progressPointDate: "Not applicable",
      supportOrHintsUsed: "Self-reported", change: "Not calculated",
      feedback: "Not yet recorded", learnerAction: "Not yet recorded",
      improvementAfterFeedback: "Not claimed", target: "Not yet recorded",
      deadline: "Not yet recorded", reviewDate: "Not yet recorded", status: "Background only",
    });
  });
  return result;
}

export async function buildDetailedLearnerReportPdf(data: ReportEvidence) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 790; let pageNumber = 1;
  const footer = () => {
    page.drawLine({ start: { x: 45, y: 38 }, end: { x: 550, y: 38 }, thickness: .5, color: rgb(.72, .77, .8) });
    page.drawText(`SCCB Digital Learning Hub | Individual Learner Report | Page ${pageNumber}`, { x: 45, y: 22, size: 8, font: regular, color: rgb(.32, .39, .43) });
  };
  const newPage = () => { footer(); page = pdf.addPage([595, 842]); pageNumber += 1; y = 790; };
  const ensureSpace = (minimum: number) => { if (y < minimum) newPage(); };
  const line = (text: string, size = 9, strong = false, indent = 0) => {
    for (const part of wrap(text, Math.max(44, 100 - indent))) {
      if (y < 58) newPage();
      page.drawText(part, { x: 45 + indent * 5, y, size, font: strong ? bold : regular, color: rgb(.08, .14, .17) });
      y -= size + 5;
    }
  };
  const heading = (number: number, title: string) => {
    ensureSpace(145);
    y -= 8; line(`${number}. ${title}`, 14, true);
    page.drawLine({ start: { x: 45, y: y + 8 }, end: { x: 550, y: y + 8 }, thickness: 1, color: rgb(0, .45, .43) });
    y -= 8;
  };
  const asAt = new Date(data.exportedAt);
  const academic = data.comparisons.filter(item => !isPriorExperienceSkill(String(related(item.skills)?.title ?? "")));
  const background = data.comparisons.filter(item => isPriorExperienceSkill(String(related(item.skills)?.title ?? "")));
  const academicSkills = data.skills.filter(item => !isPriorExperienceSkill(String(item.title ?? "")));
  const assessedIds = new Set(academic.filter(item => evidenceCounts(item.evidence).startingQuestionCount > 0).map(item => item.skill_id));
  const valid = academic.filter(item => hasValidComparableProgress({
    latestPercentage: nullableNumber(item.latest_percentage), improvementPoints: nullableNumber(item.improvement_points),
    evidence: item.evidence, progressDate: assessmentDate(item.progress_result),
  }));
  const active = data.targets.filter(item => ["approved", "active", "extended"].includes(String(item.status)));
  const achieved = data.targets.filter(item => item.status === "achieved");
  const overdue = data.targets.filter(item => reportTargetStatus(String(item.status), String(item.target_date), asAt) === "Overdue");
  const nextReview = [...data.targets.map(item => stringOrNull(item.review_on)), ...data.teacherActions.map(item => stringOrNull(item.review_on))]
    .filter((value): value is string => Boolean(value)).sort().find(value => new Date(`${value}T23:59:59`) >= asAt) ?? null;

  line("Individual Learner Report", 20, true);
  line("Starting point to progress: curriculum, feedback, response and target evidence", 10);
  heading(1, "Learner and programme details");
  line(`Learner: ${data.learnerName}`, 11, true); line(`Class: ${data.className}`); line(`Course: ${data.courseTitle}`);
  line(`Enrolled: ${formatDate(data.enrolledAt)} | Report generated: ${asAt.toLocaleString("en-GB")}`);

  heading(2, "Learner progress overview");
  line(`Starting-point status: ${assessedIds.size} of ${academicSkills.length} academic skills have evidence.`);
  line(`Starting-point assessment date: ${firstDate(data.assessments.filter(item => ["course_starting_point", "unit_starting_point"].includes(String(item.kind))).map(item => stringOrNull(item.completed_at)))}`);
  line(`Topics assessed: ${topicNames(academic.filter(item => evidenceCounts(item.evidence).startingQuestionCount > 0))}.`);
  line(`Topics awaiting assessment: ${topicNamesFromSkills(academicSkills.filter(item => !assessedIds.has(item.id)))}.`);
  line(`Initial strengths: ${skillNames(academic.filter(item => evidenceCounts(item.evidence).startingSufficient && Number(item.starting_percentage) >= 70))}.`);
  line(`Initial areas requiring support: ${skillNames(academic.filter(item => evidenceCounts(item.evidence).startingSufficient && Number(item.starting_percentage) < 50))}.`);
  line(`Current progress-point status: ${valid.length ? `${valid.length} verified comparable skill result${valid.length === 1 ? "" : "s"}` : "Progress point not yet assessed."}`);
  line(`Verified progress: ${valid.length ? valid.map(item => `${String(related(item.skills)?.title)} ${signed(item.improvement_points)} points`).join("; ") : "Insufficient comparable evidence"}.`);
  line(`Targets: ${active.length} active | ${achieved.length} achieved | ${overdue.length} overdue | next review ${formatDate(nextReview)}.`);

  heading(3, "Starting-point profile");
  line(`Assessment coverage: starting-point evidence available for ${assessedIds.size} of ${academicSkills.length} academic skills.`);
  academic.forEach(item => {
    const counts = evidenceCounts(item.evidence);
    line(`${parent(related(item.skills)?.topics)} | ${String(related(item.skills)?.title ?? "Skill")}: ${counts.startingSufficient ? `${item.starting_percentage}%` : counts.startingQuestionCount ? `Insufficient evidence (${counts.startingQuestionCount} question${counts.startingQuestionCount === 1 ? "" : "s"}; recorded response ${item.starting_percentage}%)` : "Not yet recorded"} | ${formatDate(assessmentDate(item.starting_result))} | ${Number(resultValue(item.starting_result, "hints_used") ?? 0)} hints.`);
  });
  if (!academic.length) line("Academic starting-point evidence not yet recorded.");

  heading(4, "Learner background and prior experience");
  line("Self-reported context is excluded from academic mastery unless supported by assessed practical evidence.", 8);
  background.forEach(item => line(`${String(related(item.skills)?.title ?? "Background item")}: recorded response ${item.starting_percentage}% (self-reported).`));
  if (!background.length) line("Learner background and prior experience not yet recorded.");

  heading(5, "Topic-by-topic progress");
  const topicRows = academicSkills.map(skill => {
    const topic = related(skill.topics); const unit = related(topic?.units);
    return { unitTitle: `${String(unit?.code ?? "Unit")} ${String(unit?.title ?? "not recorded")}`, topicTitle: String(topic?.title ?? "Topic not recorded"), skill };
  });
  groupByTopic(topicRows).forEach(group => {
    ensureSpace(125);
    line(`${group.unitTitle} | Topic: ${group.topicTitle}`, 11, true);
    group.items.forEach(({ skill }) => {
      ensureSpace(112);
      const comparison = academic.find(item => item.skill_id === skill.id);
      const mastery = data.mastery.find(item => item.skill_id === skill.id);
      const target = data.targets.find(item => related(item.skills)?.id === skill.id || related(item.topics)?.id === related(skill.topics)?.id);
      const counts = evidenceCounts(comparison?.evidence);
      const comparable = comparison ? hasValidComparableProgress({
        latestPercentage: nullableNumber(comparison.latest_percentage), improvementPoints: nullableNumber(comparison.improvement_points),
        evidence: comparison.evidence, progressDate: assessmentDate(comparison.progress_result),
      }) : false;
      line(`Skill: ${String(skill.title)} | Starting point: ${counts.startingSufficient ? `${comparison?.starting_percentage}% on ${formatDate(assessmentDate(comparison?.starting_result))}` : "Insufficient evidence"} | Progress point: ${comparable ? `${comparison?.latest_percentage}% on ${formatDate(assessmentDate(comparison?.progress_result))}` : "Progress point not yet assessed."}`, 9, true, 1);
      line(`Support/hints: ${Number(resultValue(comparison?.progress_result, "hints_used") ?? 0)} at progress point | Change: ${comparable ? `${signed(comparison?.improvement_points)} points` : "not calculable"} | Current evidence level: ${mastery ? academicEvidenceLabel({ attemptsCount: Number(mastery.attempts_count), hintsUsed: Number(mastery.hints_used), masteryScore: Number(mastery.mastery_score), retrievalScore: nullableNumber(mastery.retrieval_score) }) : "Insufficient evidence"}.`, 8, false, 1);
      line(`Identified gaps: ${Number(mastery?.repeated_error_count ?? 0) ? `${mastery?.repeated_error_count} repeated errors` : "Not yet recorded"} | Feedback: ${String(feedbackForSkill(data.feedback, String(skill.id))?.feedback ?? "Not yet recorded")} | Target: ${String(target?.target_text ?? "Not yet recorded")} | Review: ${formatDate(stringOrNull(target?.review_on))}.`, 8, false, 1);
    });
  });

  heading(6, "Feedback and improvement after feedback");
  data.feedback.forEach(item => {
    ensureSpace(110);
    const answer = related(item.attempt_answers); const attempt = related(answer?.attempts); const activity = related(attempt?.activities);
    const followUp = data.attempts.find(candidate => candidate.activity_id === attempt?.activity_id && Number(candidate.attempt_number) > Number(attempt?.attempt_number));
    line(`${formatDate(stringOrNull(item.reviewed_at) ?? stringOrNull(answer?.answered_at))} | ${parentFromActivity(activity)} | ${String(activity?.title ?? "Activity")}`, 10, true);
    line(`Did well: ${answer?.mark === answer?.max_mark ? "Full marks on the reviewed response" : "Not yet recorded"} | Area for improvement: ${answer?.mark !== answer?.max_mark ? "Response did not yet achieve full marks" : "Not yet recorded"}.`);
    line(`Feedback: ${String(item.feedback ?? answer?.feedback ?? "Not yet recorded")} | Learner action: ${item.status === "returned" ? "Returned for further practice" : "Not yet recorded"} | Learner response: ${formatAnswer(answer?.answer)}.`);
    line(`Before feedback: ${attempt?.percentage ?? "Not yet recorded"}% | After feedback: ${followUp?.percentage ?? "Not yet recorded"}${followUp ? "%" : ""} | Improvement: ${followUp && item.feedback ? `${signed(Number(followUp.percentage) - Number(attempt?.percentage))} percentage points` : "Insufficient follow-up evidence"} | Teacher confirmation: ${item.reviewed_by ? `reviewed ${formatDate(stringOrNull(item.reviewed_at))}` : "Not yet recorded"}.`);
  });
  if (!data.feedback.length) line("No teacher-reviewed formative feedback is recorded.");

  heading(7, "Misconceptions and gaps");
  data.misconceptions.forEach(item => {
    ensureSpace(85);
    const definition = related(item.misconceptions); const skill = related(definition?.skills);
    line(`${parent(skill?.topics)} | ${String(skill?.title ?? "Skill")} | ${String(definition?.title ?? "Misconception")}: ${item.occurrence_count} occurrence(s), ${item.resolved_at ? "resolved" : "open"} | Re-teach: ${String(definition?.reteach_guidance ?? "Not yet recorded")}.`);
  });
  if (!data.misconceptions.length) line("No tagged misconceptions recorded.");

  heading(8, "Teacher actions and interventions");
  data.teacherActions.forEach(item => {
    ensureSpace(95);
    const metadata = asRecord(item.metadata);
    line(`${formatDate(stringOrNull(item.created_at))} | ${String(metadata.unit ?? "Unit not linked")} | ${String(metadata.topic ?? "Topic not linked")} | ${String(item.action)}`, 10, true);
    line(`Evidence reason: ${String(item.reason)} | Skill/misconception: ${String(metadata.skill ?? metadata.misconception ?? "Not linked")} | Feedback: ${String(metadata.feedback ?? "Not yet recorded")} | Intervention: ${String(metadata.intervention ?? "Not yet recorded")} | Review: ${formatDate(stringOrNull(item.review_on))} | Outcome/impact: ${String(item.outcome ?? "Not yet recorded")} | Next action: ${String(metadata.next_action ?? "Not yet recorded")}.`);
  });
  if (!data.teacherActions.length) line("No teacher actions recorded.");

  heading(9, "Formative targets");
  data.targets.forEach(item => {
    ensureSpace(125);
    const evidence = asRecord(item.evidence); const success = String(item.success_measure ?? "Not yet recorded");
    line(`${reportTargetStatus(String(item.status), String(item.target_date), asAt)} | ${parent(item.topics)} | ${String(related(item.skills)?.title ?? "Skill not linked")}`, 10, true);
    line(`Target: ${String(item.target_text)} | Baseline: ${String(evidence.baseline ?? item.reason ?? "Not yet recorded")} | Planned activity: ${String(related(item.activities)?.title ?? evidence.planned_activity ?? "Not yet recorded")}.`);
    line(`Success criterion: ${success} | Independence: ${/without hints|independent/i.test(success) ? "Independent / without hints" : String(evidence.independence ?? "Not yet recorded")} | Start: ${formatDate(stringOrNull(item.starts_on))} | Deadline: ${formatDate(stringOrNull(item.target_date))} | Review: ${formatDate(stringOrNull(item.review_on))}.`);
    line(`Teacher: ${String(related(item.teachers)?.display_name ?? (item.approved_by ? "Teacher recorded" : "Awaiting approval"))} | Review evidence: ${String(item.review_result ?? "Not yet recorded")} | Outcome: ${String(item.final_outcome ?? "Not yet recorded")} | Learner reflection: ${String(evidence.learner_reflection ?? "Not yet recorded")} | Next action: ${String(item.next_action ?? "Not yet recorded")}.`);
  });
  if (!data.targets.length) line("No formative targets recorded.");

  heading(10, "Learner reflections");
  const reflections = data.snapshots.filter(item => item.learner_reflection);
  reflections.forEach(item => {
    const snapshot = asRecord(item.snapshot_data);
    line(`${formatDate(stringOrNull(item.created_at))} | ${String(related(item.academic_periods)?.name ?? "Formal review")}`, 10, true);
    line(`Understood well: ${String(snapshot.understood_well ?? "Not yet recorded")} | Found difficult: ${String(snapshot.found_difficult ?? "Not yet recorded")} | Changed after feedback: ${String(snapshot.changed_after_feedback ?? "Not yet recorded")} | Improvement evidence: ${String(snapshot.improvement_evidence ?? "Not yet recorded")} | Still to practise: ${String(snapshot.still_to_practise ?? "Not yet recorded")} | Next action: ${String(item.next_priorities ?? "Not yet recorded")} | Learner reflection: ${String(item.learner_reflection)} | Teacher response: ${String(snapshot.teacher_response ?? "Not yet recorded")}.`);
  });
  if (!reflections.length) line("Learner reflection not yet provided.");

  heading(11, "Retrieval and retention");
  data.retrieval.forEach(item => line(`${parent(item.topics)} | ${String(item.status)} | scheduled ${formatDate(stringOrNull(item.scheduled_for))}${item.completed_at ? ` | completed ${formatDate(stringOrNull(item.completed_at))}` : ""}.`));
  if (!data.retrieval.length) line("No retrieval review scheduled yet.");

  heading(12, "Dated progress timeline");
  data.attempts.forEach(item => { ensureSpace(96); line(`${formatDate(stringOrNull(item.completed_at))} | ${parentFromActivity(item.activities)} | ${String(related(item.activities)?.title ?? "Activity")} | attempt ${item.attempt_number}: ${item.percentage}% (${item.pathway}) | ${item.hints_used} hints${item.teacher_override_by ? " | teacher-supported" : ""}.`); });
  if (!data.attempts.length) line("No completed practice recorded.");

  heading(13, "Badges and coins");
  line("Engagement rewards are separate from academic progress.", 8);
  data.badges.forEach(item => line(`Badge: ${String(related(item.badge_definitions)?.title ?? "Badge")} | ${formatDate(stringOrNull(item.awarded_at))} | ${String(item.reason)}.`));
  const balance = data.coins.filter(item => item.transaction_status !== "reversed").reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  line(`Current coin balance: ${balance}.`);

  heading(14, "Term or semester snapshots");
  data.snapshots.forEach(item => line(`${formatDate(stringOrNull(item.created_at))} | ${String(related(item.academic_periods)?.name ?? "Academic period")} | Next priorities: ${String(item.next_priorities ?? "Not yet recorded")} | Learner reflection: ${String(item.learner_reflection ?? "Learner reflection not yet provided.")}.`));
  if (!data.snapshots.length) line("No permanent period snapshot recorded.");

  heading(15, "Audit and exceptional access records");
  data.overrides.forEach(item => line(`${formatDate(stringOrNull(item.created_at))} | ${parentFromActivity(item.activities)} | ${String(related(item.activities)?.title ?? "Activity")} | Teacher: ${String(related(item.teachers)?.display_name ?? "Not recorded")} | Reason: ${String(item.reason)} | ${item.revoked_at ? `revoked ${formatDate(stringOrNull(item.revoked_at))}` : `expires ${formatDate(stringOrNull(item.expires_at))}`}.`));
  if (!data.overrides.length) line("No exceptional access records for this learner.");
  y -= 8;
  line("Accuracy note: self-reported experience is not academic mastery; one-question evidence is insufficient; progress is claimed only from dated, comparable progress-point evidence. Missing evidence is shown explicitly.", 8);
  footer();
  pdf.setTitle(`${data.learnerName} - Individual Learner Report`);
  pdf.setSubject("Starting point, curriculum progress, feedback, learner response, targets and review evidence");
  pdf.setAuthor("SCCB Digital Learning Hub"); pdf.setCreator("SCCB Digital Learning Hub"); pdf.setCreationDate(asAt);
  return pdf.save();
}

function feedbackForSkill(items: Row[], skillId: string) {
  return items.find(item => related(related(item.attempt_answers)?.questions)?.skill_id === skillId);
}
function followUpImprovement(review: Row | undefined, attempts: Row[]) {
  if (!review?.feedback) return "Not yet recorded";
  const answer = related(review.attempt_answers); const attempt = related(answer?.attempts);
  const followUp = attempts.find(item => item.activity_id === attempt?.activity_id && Number(item.attempt_number) > Number(attempt?.attempt_number));
  return followUp ? `${signed(Number(followUp.percentage) - Number(attempt?.percentage))} percentage points` : "Insufficient follow-up evidence";
}
function rows(value: unknown): Row[] { return Array.isArray(value) ? value as Row[] : []; }
function related(value: unknown): Row | undefined { return Array.isArray(value) ? value[0] as Row | undefined : value && typeof value === "object" ? value as Row : undefined; }
function asRecord(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
function nullableNumber(value: unknown) { return value == null ? null : Number(value); }
function stringOrNull(value: unknown) { return typeof value === "string" ? value : null; }
function signed(value: unknown) { const number = Number(value); return `${number >= 0 ? "+" : ""}${number}`; }
function formatDate(value: string | null | undefined) { return value ? new Date(value).toLocaleDateString("en-GB") : "Not yet recorded"; }
function firstDate(values: (string | null)[]) { return formatDate(values.filter((value): value is string => Boolean(value)).sort()[0]); }
function resultValue(value: unknown, key: string) { return related(value)?.[key]; }
function assessmentDate(value: unknown) { const row = related(value); const instance = related(row?.assessment_instances); return stringOrNull(instance?.completed_at) ?? stringOrNull(row?.created_at); }
function parent(topicValue: unknown) { const topic = related(topicValue); const unit = related(topic?.units); return `${String(unit?.code ?? "Unit")} ${String(unit?.title ?? "not recorded")} | ${String(topic?.title ?? "Topic not recorded")}`; }
function parentFromActivity(activityValue: unknown) { const lesson = related(related(activityValue)?.lessons); return parent(lesson?.topics); }
function topicNames(items: Row[]) { const names = [...new Set(items.map(item => String(related(related(item.skills)?.topics)?.title ?? "Topic not linked")))]; return names.length ? names.join(", ") : "Not yet recorded"; }
function topicNamesFromSkills(items: Row[]) { const names = [...new Set(items.map(item => String(related(item.topics)?.title ?? "Topic not linked")))]; return names.length ? names.join(", ") : "None"; }
function skillNames(items: Row[]) { return items.length ? items.map(item => String(related(item.skills)?.title ?? "Skill")).join(", ") : "Insufficient evidence"; }
function formatAnswer(value: unknown) { if (typeof value === "string") return value; try { return value == null ? "Not yet recorded" : JSON.stringify(value); } catch { return String(value ?? "Not yet recorded"); } }
function wrap(text: string, width: number) {
  const words = text.replace(/[^\x20-\x7E]/g, "-").split(/\s+/); const lines: string[] = []; let current = "";
  for (const word of words) { if ((current + " " + word).trim().length > width) { if (current) lines.push(current); current = word; } else current = (current + " " + word).trim(); }
  if (current) lines.push(current); return lines;
}

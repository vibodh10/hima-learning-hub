import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  conciseCurrentJudgement, evidenceCounts, groupByTopic, hasValidComparableProgress,
  isPriorExperienceSkill, learnerReflectionLabel, reportTargetStatus, topicAssessmentStatus,
} from "./learner-report-model";
import { configuredUnits } from "./learning-catalog";
import { summariseWorkbookStartingPoint } from "./workbook-starting-point";

type Row = Record<string, unknown>;
export type ConciseReportEvidence = {
  learnerName: string; className: string; courseTitle: string; teacherName: string;
  enrolledAt: string | null; exportedAt: string; reportRange?: string;
  skills: Row[]; comparisons: Row[]; mastery: Row[]; attempts: Row[];
  targets: Row[]; feedback: Row[]; misconceptions: Row[]; teacherActions: Row[];
  snapshots: Row[]; retrieval: Row[]; badges: Row[]; coins: Row[];
  assessments: Row[]; overrides: Row[]; curriculumAttempts: Row[];
  achievement?: Row;
  portfolioArtifacts?: Row[]; worksheets?: Row[]; catchUpRecords?: Row[];
  recognitions?: Row[]; attendanceEvents?: Row[]; certificateReviews?: Row[];
  workbookProgress?: Row[];
};

export async function buildConciseLearnerReportPdf(data: ConciseReportEvidence) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 790; let pageNumber = 1;
  const footer = () => {
    page.drawLine({ start: { x: 45, y: 38 }, end: { x: 550, y: 38 }, thickness: .5, color: rgb(.72, .77, .8) });
    page.drawText(`SCCB Digital Learning Hub | Individual Learner Report | Page ${pageNumber}`, { x: 45, y: 22, size: 8, font: regular, color: rgb(.32, .39, .43) });
  };
  const newPage = () => { footer(); page = pdf.addPage([595, 842]); pageNumber += 1; y = 790; };
  const ensure = (minimum: number) => { if (y < minimum) newPage(); };
  const line = (text: string, size = 9, strong = false, indent = 0) => {
    for (const part of wrap(text, Math.max(44, 100 - indent))) {
      if (y < 72) newPage();
      page.drawText(part, { x: 45 + indent * 5, y, size, font: strong ? bold : regular, color: rgb(.08, .14, .17) });
      y -= size + 5;
    }
  };
  const heading = (number: number, title: string) => {
    ensure(145); y -= 8; line(`${number}. ${title}`, 14, true);
    page.drawLine({ start: { x: 45, y: y + 8 }, end: { x: 550, y: y + 8 }, thickness: 1, color: rgb(0, .45, .43) }); y -= 8;
  };
  const subheading = (title: string) => { ensure(105); y -= 5; line(title, 11, true); };
  const asAt = new Date(data.exportedAt);
  const academicSkills = data.skills.filter(skill =>
    !isPriorExperienceSkill(String(skill.title ?? "")) && String(related(skill.topics)?.title ?? "").toLowerCase() !== "course starting point");
  const academic = data.comparisons.filter(item =>
    !isPriorExperienceSkill(String(related(item.skills)?.title ?? "")) && !isCourseStartingPointComparison(item));
  const background = data.comparisons.filter(item =>
    isPriorExperienceSkill(String(related(item.skills)?.title ?? "")) || isCourseStartingPointComparison(item));
  const topicRows = academicSkills.map(skill => {
    const topic = related(skill.topics); const unit = related(topic?.units);
    const comparison = academic.find(item => item.skill_id === skill.id);
    const counts = evidenceCounts(comparison?.evidence);
    const valid = comparison ? hasValidComparableProgress({
      latestPercentage: numberOrNull(comparison.latest_percentage),
      improvementPoints: numberOrNull(comparison.improvement_points),
      evidence: comparison.evidence, progressDate: assessmentDate(comparison.progress_result),
    }) : false;
    return {
      unitTitle: `${String(unit?.code ?? "Course")} ${String(unit?.title ?? "starting point and learner background")}`,
      topicTitle: String(topic?.title ?? "Topic not linked"), topicId: topic?.id,
      skill, comparison, counts, valid,
    };
  });
  const groups = groupByTopic(topicRows);
  const workbookStartingPoints = configuredUnits.flatMap(unit => {
    const summary = summariseWorkbookStartingPoint(
      data.workbookProgress ?? [],
      unit.code,
      unit.topics.map(topic => topic.code),
    );
    return summary ? [{ unit, summary }] : [];
  });
  const active = data.targets.filter(item => ["approved", "active", "extended"].includes(String(item.status)));
  const achieved = data.targets.filter(item => item.status === "achieved");
  const nextReview = [...data.targets.map(item => textOrNull(item.review_on)), ...data.teacherActions.map(item => textOrNull(item.review_on))]
    .filter((value): value is string => Boolean(value)).sort().find(value => new Date(`${value}T23:59:59`) >= asAt) ?? null;

  line("Individual Learner Report", 20, true);
  line("Concise educational summary: starting point, progress, feedback and next steps", 10);

  heading(1, "Learner overview");
  line(`Learner: ${data.learnerName} | Course: ${data.courseTitle}`, 10, true);
  line(`Class / group: ${data.className} | Teacher: ${data.teacherName}`);
  line(`Enrolled: ${date(data.enrolledAt)} | Report date: ${date(data.exportedAt)}`);
  line(`Evidence period: ${data.reportRange ?? `All recorded evidence through ${date(data.exportedAt)}`}.`, 9, true);
  const partial = groups.filter(group => statusFor(group.items) === "Partially assessed").length;
  const established = groups.filter(group => statusFor(group.items) === "Baseline established").length;
  const progressed = groups.filter(group => statusFor(group.items) === "Progress point completed").length;
  line(workbookStartingPoints.length
    ? `Starting point: ${workbookStartingPoints.map(({unit,summary}) => `Unit ${unit.code} ${summary.mark}/${summary.maxMark} (${summary.percentage}%), ${summary.recommendedLevel ?? "route pending"}`).join("; ")}.`
    : `Starting point: ${partial} topic(s) partially assessed; ${established} baseline(s) established. Limited evidence is not a secure baseline.`);
  line(`Current progress: ${progressed ? `${progressed} topic(s) have comparable progress evidence.` : "No comparable progress-point assessment has been completed yet."}`);
  line(`Targets: ${active.length} active | ${achieved.length} achieved | Next review: ${date(nextReview)}.`);
  if(data.achievement)line(`Computing Achievement: ${Number(data.achievement.ap_total??0)} AP | Level: ${String(data.achievement.current_level_title??"Building toward Bronze")}${data.achievement.next_level_title?` | ${Number(data.achievement.points_to_next??0)} AP to ${String(data.achievement.next_level_title)}`:""}.`);

  heading(2, "Starting-point summary by topic");
  workbookStartingPoints.forEach(({unit,summary}) => {
    ensure(155);
    line(`Unit ${unit.code} ${unit.title} | ${summary.complete ? "Baseline established" : "Partially assessed"}`, 10, true);
    line(`Independent result: ${summary.mark} of ${summary.maxMark} (${summary.percentage}%) | Date: ${date(summary.completedAt)} | Recommended route: ${summary.recommendedLevel ?? "not yet available"}.`);
    line("The route changes support and challenge inside the assigned unit; it does not change the learner's group, timetable or mandatory assignments.");
    summary.topics.forEach(topic => {
      const configuredTopic = unit.topics.find(item => item.code === topic.topicCode);
      line(`${topic.topicCode} ${configuredTopic?.title ?? "Topic"}: ${topic.mark}/${topic.maxMark} (${topic.percentage}%) | ${topic.skills.join(", ") || "Mapped diagnostic skills not labelled"}.`, 8, false, 1);
    });
  });
  groups.forEach(group => {
    ensure(150);
    const sampled = group.items.filter(item => item.counts.startingQuestionCount > 0);
    const secure = group.items.filter(item => item.counts.startingSufficient);
    const positive = sampled.filter(item => Number(item.comparison?.starting_percentage ?? 0) > 0);
    const low = sampled.filter(item => Number(item.comparison?.starting_percentage ?? 0) === 0);
    line(`${group.unitTitle} | Topic: ${group.topicTitle} | ${statusFor(group.items)}`, 10, true);
    line(`Starting point: ${sampled.length} of ${group.items.length} skills sampled on ${firstDate(sampled.map(item => assessmentDate(item.comparison?.starting_result)))}.`);
    line(`Evidence: ${secure.length === group.items.length ? "Sufficient to establish a baseline." : sampled.length ? "Limited - one question per sampled skill; no secure topic percentage is calculated." : "Not started."}`);
    line(`Initial indications: ${positive.length ? `positive responses in ${positive.map(item => item.skill.title).join(", ")}` : "no secure strengths established"}${low.length ? `; lowest response in ${low.map(item => item.skill.title).join(", ")}` : ""}.`);
    line(`Next step: ${secure.length < group.items.length ? "Complete a fuller baseline assessment." : group.items.some(item => item.valid) ? "Use the comparison and current target to guide the next learning." : "Complete a comparable progress-point assessment."}`);
  });
  if (!workbookStartingPoints.length && !groups.length) line("No starting-point evidence has been recorded yet.");

  heading(3, "Topic progress and feedback");
  groups.forEach(group => {
    ensure(145); line(`${group.unitTitle} | ${group.topicTitle}`, 10, true);
    group.items.forEach(item => {
      const hints = Number(value(item.comparison?.progress_result, "hints_used") ?? 0);
      line(`${item.skill.title} | Start: ${item.counts.startingQuestionCount ? item.counts.startingSufficient ? `${item.comparison?.starting_percentage}%` : "Initial indication - limited evidence" : "Not assessed"} | Progress: ${item.valid ? `${item.comparison?.latest_percentage}%` : "Not assessed"} | Support: ${hints ? `${hints} hints` : "none recorded"} | Change: ${item.valid ? `${signed(item.comparison?.improvement_points)} points` : "not calculable"} | ${conciseCurrentJudgement({
        startingQuestionCount: item.counts.startingQuestionCount, startingSufficient: item.counts.startingSufficient,
        progressSufficient: item.counts.progressSufficient, validComparableProgress: item.valid,
        hintsUsed: hints, latestPercentage: numberOrNull(item.comparison?.latest_percentage),
      })}.`, 8);
    });
    const target = data.targets.find(item => related(item.topics)?.id === group.items[0]?.topicId ||
      group.items.some(row => row.skill.id === related(item.skills)?.id));
    const review = data.feedback.find(item => feedbackTopicId(item) === group.items[0]?.topicId);
    const cycle = review ? feedbackCycle(review, data.attempts) : null;
    const gap = mainGap(group.items, data.misconceptions);
    line(`Main gap: ${gap}`);
    line(cycle?.feedback
      ? `Feedback: ${cycle.feedback} | Learner action: ${cycle.learnerAction} | Improvement: ${cycle.improvement}.`
      : "No teacher feedback and follow-up evidence has been recorded for this topic yet.");
    line(`Topic target: ${String(target?.target_text ?? "No current topic target")} | Review: ${date(textOrNull(target?.review_on))}.`);
  });

  heading(4, "Feedback, action and improvement");
  const completedCycles = data.feedback.map(item => feedbackCycle(item, data.attempts)).filter(item => item.feedback && item.followUp);
  if (!completedCycles.length) line("No completed feedback-and-improvement cycle has been recorded yet.");
  completedCycles.forEach(cycle => {
    ensure(115); line(`${cycle.parent} | ${cycle.skill}`, 10, true);
    line(`Original: ${cycle.original} -> Feedback: ${cycle.feedback} -> Learner action: ${cycle.learnerAction} -> Follow-up: ${cycle.followUpText} -> Improvement: ${cycle.improvement}.`);
    line(`Teacher judgement: ${cycle.teacherJudgement} | Next action: ${cycle.nextAction}.`);
  });

  heading(5, "Targets and next steps");
  if (!data.targets.length) line("No targets have been recorded yet.");
  data.targets.forEach(item => {
    ensure(105);
    line(`${reportTargetStatus(String(item.status), String(item.target_date), asAt)} | ${targetParent(item)} | Deadline ${date(textOrNull(item.target_date))}`, 10, true);
    line(`${String(item.target_text)} | Baseline: ${String(item.reason ?? "Not recorded")} | Success: ${String(item.success_measure ?? "To be completed")} | Review: ${date(textOrNull(item.review_on))}.`);
    if (!item.review_on) line("Warning: Review date needs to be added.", 8, true);
    else if (!item.success_measure) line("Warning: Success measure needs to be added.", 8, true);
  });

  ensure(330);
  heading(6, "Before, after and participation evidence");
  const worksheets = data.worksheets ?? [];
  const evidenceTopics = uniqueTopicKeys([
    ...(data.portfolioArtifacts ?? []),
    ...worksheets,
  ]);
  if (!evidenceTopics.length) line("No in-portal before, progress-check or after artifacts have been recorded yet.");
  evidenceTopics.forEach(({ unitCode, topicCode }) => {
    ensure(165);
    const topicWorksheets = worksheets.filter(item => String(item.unit_code) === unitCode && String(item.topic_code) === topicCode);
    const before = topicWorksheets.find(item => item.evidence_stage === "before");
    const after = [...topicWorksheets].reverse().find(item => item.evidence_stage === "after");
    const checkpoints = topicWorksheets.filter(item => ["progress_check_1", "progress_check_2"].includes(String(item.evidence_stage)));
    line(`Unit ${unitCode} | ${topicCode}`, 10, true);
    line(before
      ? `Before (${date(textOrNull(before.submitted_at))}): ${worksheetExcerpt(before.responses)}`
      : "Before: No before artifact recorded.", 8);
    line(after
      ? `After (${date(textOrNull(after.submitted_at))}): ${worksheetExcerpt(after.responses)}`
      : "After: No after artifact recorded.", 8);
    line(`Progress checks: ${checkpoints.length} recorded${checkpoints.length ? ` on ${checkpoints.map(item => date(textOrNull(item.submitted_at))).join(", ")}` : ""}. Confidence entries: ${topicWorksheets.length ? topicWorksheets.map(item => Number(item.confidence)).join(", ") : "none recorded"}.`, 8);
    line(before && after
      ? "A dated before-and-after comparison is available for teacher review; this report does not infer improvement from completion alone."
      : "A complete before-and-after comparison is not yet available.", 8);
  });

  subheading("Catch-up and outstanding learning");
  const catchUp = data.catchUpRecords ?? [];
  catchUp.forEach(item => line(`${item.completed_at ? "Completed" : "Outstanding"} | Unit ${String(item.unit_code)} | ${String(item.topic_code)} | opened teaching week ${Number(item.opened_teaching_week)} on ${date(textOrNull(item.opened_at))}${item.completed_at ? ` | completed ${date(textOrNull(item.completed_at))}` : ""} | source: ${String(item.source).replaceAll("_", " ")}.`, 8));
  if (!catchUp.length) line("No catch-up records are currently available.", 8);

  subheading("Recognition and certificate review");
  const recognitions = data.recognitions ?? [];
  recognitions.slice(0, 12).forEach(item => line(`${date(textOrNull(item.recognised_at))} | ${String(item.title)}: ${String(item.message)}`, 8));
  if (!recognitions.length) line("No professional recognition has been recorded yet.", 8);
  (data.certificateReviews ?? []).forEach(item => {
    const level = related(item.achievement_levels);
    line(`${String(level?.title ?? "Achievement level")} | ${String(item.status).replaceAll("_", " ")} since ${date(textOrNull(item.eligible_at))}${item.reviewed_at ? ` | reviewed ${date(textOrNull(item.reviewed_at))}` : " | staff review required"}.`, 8);
  });

  subheading("Provider-derived attendance record");
  const attendance = data.attendanceEvents ?? [];
  if (attendance.length) {
    const attended = attendance.filter(item => ["present", "late"].includes(String(item.attendance_status))).length;
    const providers = [...new Set(attendance.map(item => String(item.provider_name)))].join(", ");
    line(`${attendance.length} imported session record(s) | ${attended} present or late | provider(s): ${providers}. Attendance is reported from imported provider events, not teacher entry.`, 8);
  } else line("No imported attendance-provider events are available in this report.", 8);

  heading(7, "Reflection and evidence history");
  const latest = data.snapshots.find(item => item.learner_reflection) ?? data.snapshots[0];
  const snapshot = record(latest?.snapshot_data);
  line(`Latest learner reflection: ${learnerReflectionLabel(textOrNull(latest?.learner_reflection))}`);
  line(`Teacher response: ${String(snapshot.teacher_response ?? "No teacher response recorded.")}`);
  line(`Retrieval check date: ${date(textOrNull(data.retrieval.find(item => item.status !== "cancelled")?.scheduled_for))}.`);
  subheading("Recent assessment timeline");
  workbookStartingPoints.forEach(({unit,summary}) => line(`${date(summary.completedAt)} | Unit ${unit.code} ${unit.title} | starting point | ${summary.mark}/${summary.maxMark} (${summary.percentage}%) | ${summary.recommendedLevel ?? "route pending"}.`, 8));
  data.attempts.slice(-8).reverse().forEach(item => line(`${date(textOrNull(item.completed_at))} | ${parentFromActivity(item.activities)} | ${String(related(item.activities)?.title ?? "Activity")} | ${item.percentage}% | ${item.hints_used} hints.`, 8));

  subheading("Curriculum question sessions and papers");
  data.curriculumAttempts.slice(0,20).forEach(item=>{
    const submitted=Array.isArray(item.question_results)&&(item.question_results as Row[]).some(result=>typeof result.answer==="string");
    const outcome=submitted&&item.teacher_mark==null?"awaiting teacher review":`${item.mark}/${item.max_mark} (${Math.round(Number(item.percentage))}%)`;
    line(`${date(textOrNull(item.completed_at))} | Unit ${String(item.unit_code)} | ${String(item.topic_code??`${item.paper_mode??"applied"} paper`)} | ${outcome} | ${Number(item.hints_used)} hints | ${Math.round(Number(item.active_seconds)/60)} minutes.`,8);
    if(item.teacher_feedback)line(`Teacher feedback: ${String(item.teacher_feedback)} | reviewed ${date(textOrNull(item.reviewed_at))}.`,8,false,1);
  });
  if(!data.curriculumAttempts.length)line("No curriculum question sessions or papers recorded.",8);

  ensure(260); y -= 12;
  line("Detailed supporting evidence", 18, true);
  line("Appendix - historical and administrative records retained for review", 9);
  subheading("Full assessment history");
  workbookStartingPoints.forEach(({unit,summary}) => line(`${date(summary.completedAt)} | unit starting point | Unit ${unit.code} ${unit.title} | ${summary.mark}/${summary.maxMark} (${summary.percentage}%).`, 8));
  data.assessments.forEach(item => line(`${date(textOrNull(item.completed_at))} | ${String(item.kind).replaceAll("_", " ")} | ${String(related(item.activities)?.title ?? "Assessment")}.`, 8));
  if (!data.assessments.length && !workbookStartingPoints.length) line("No formal assessment history recorded.", 8);
  subheading("Course starting point and learner background");
  background.forEach(item => {
    const skillTitle = String(related(item.skills)?.title ?? "Background item");
    const category = isPriorExperienceSkill(skillTitle) ? "self-reported; excluded from academic mastery" : "course-level starting point; excluded from unit mastery";
    line(`${skillTitle}: ${item.starting_percentage}% recorded response (${category}).`, 8);
  });
  if (!background.length) line("Learner background questionnaire not yet completed.", 8);
  subheading("Rewards and coin ledger");
  line(`${data.badges.length} badges | ${data.coins.filter(item => item.transaction_status !== "reversed").reduce((sum, item) => sum + Number(item.amount ?? 0), 0)} coins. Rewards are separate from academic progress.`, 8);
  data.coins.slice(0, 20).forEach(item => line(`${date(textOrNull(item.created_at))} | ${String(item.description)} | ${Number(item.amount) > 0 ? "+" : ""}${item.amount}.`, 8));
  subheading("Term snapshots");
  data.snapshots.forEach(item => line(`${date(textOrNull(item.created_at))} | ${String(related(item.academic_periods)?.name ?? "Academic period")} | ${String(item.next_priorities ?? "No next priority recorded")}.`, 8));
  if (!data.snapshots.length) line("No term snapshots recorded.", 8);
  subheading("Audit and exceptional access");
  data.teacherActions.forEach(item => line(`${date(textOrNull(item.created_at))} | ${String(item.action)}: ${String(item.reason)}.`, 8));
  data.overrides.forEach(item => line(`${date(textOrNull(item.created_at))} | ${String(related(item.activities)?.title ?? "Activity")} | ${String(item.reason)}.`, 8));
  if (!data.teacherActions.length && !data.overrides.length) line("No audit or exceptional-access records.", 8);
  ensure(225);
  subheading("Evidence integrity and scope");
  line(`Evidence period: ${data.reportRange ?? `All recorded evidence through ${date(data.exportedAt)}`}. Dated records outside this period are excluded. Current aggregate totals without a reliable historical timestamp are not presented as historical facts.`,8);
  line("Academic judgements use dated assessment evidence, mapped curriculum content, recorded support, teacher feedback and follow-up where available. Open-ended practical papers are not treated as finally marked until a teacher records a review.",8);
  line("A missing record is shown as not recorded or not assessed; it is never converted into a progress claim. Rewards are reported separately from academic evidence.",8);
  line("This educational progress report supports inspection discussion but is not an Ofsted certificate. Attendance, safeguarding, SEND plans and statutory records remain in the centre's approved systems and must be considered alongside it.",8);
  footer();
  pdf.setTitle(`${data.learnerName} - Individual Learner Report`);
  pdf.setSubject("Concise starting-point, progress, feedback and target summary");
  pdf.setAuthor("SCCB Digital Learning Hub"); pdf.setCreator("SCCB Digital Learning Hub"); pdf.setCreationDate(asAt);
  return pdf.save();
}

function statusFor(items: { counts: ReturnType<typeof evidenceCounts>; valid: boolean }[]) {
  return topicAssessmentStatus({
    sampledSkills: items.filter(item => item.counts.startingQuestionCount > 0).length,
    totalSkills: items.length,
    secureBaselineSkills: items.filter(item => item.counts.startingSufficient).length,
    completedProgressSkills: items.filter(item => item.valid).length,
  });
}
function feedbackCycle(review: Row, attempts: Row[]) {
  const answer = related(review.attempt_answers); const attempt = related(answer?.attempts);
  const question = related(answer?.questions); const activity = related(attempt?.activities);
  const followUp = attempts.find(item => item.activity_id === attempt?.activity_id && Number(item.attempt_number) > Number(attempt?.attempt_number));
  const before = numberOrNull(attempt?.percentage); const after = numberOrNull(followUp?.percentage);
  return {
    feedback: textOrNull(review.feedback), followUp,
    parent: parentFromActivity(activity), skill: String(related(question?.skills)?.title ?? "Skill not linked"),
    original: before == null ? "not recorded" : `${before}%`,
    learnerAction: review.status === "returned" ? "further practice completed or requested" : "not recorded",
    followUpText: after == null ? "not recorded" : `${after}%`,
    improvement: before != null && after != null ? `${signed(after - before)} percentage points` : "not calculable",
    teacherJudgement: review.reviewed_by ? `reviewed ${date(textOrNull(review.reviewed_at))}` : "not confirmed",
    nextAction: review.status === "returned" ? "review returned practice" : "none recorded",
  };
}
function feedbackTopicId(review: Row) { const answer = related(review.attempt_answers); const attempt = related(answer?.attempts); const activity = related(attempt?.activities); const lesson = related(activity?.lessons); return related(lesson?.topics)?.id; }
function mainGap(items: { skill: Row; counts: ReturnType<typeof evidenceCounts>; comparison: Row | undefined }[], misconceptions: Row[]) {
  const linked = misconceptions.find(item => {
    const skill = related(related(item.misconceptions)?.skills);
    return items.some(row => row.skill.id === skill?.id);
  });
  if (linked) return String(related(linked.misconceptions)?.title ?? "Recorded misconception");
  const low = items.filter(item => item.counts.startingQuestionCount && Number(item.comparison?.starting_percentage ?? 0) === 0);
  return low.length ? `lowest initial indication: ${low.map(item => item.skill.title).join(", ")}` : "further assessment required";
}
function targetParent(target: Row) { const topic = related(target.topics); return `${String(related(target.units)?.title ?? related(topic?.units)?.title ?? "Course")} / ${String(topic?.title ?? "General target")}`; }
function parentFromActivity(activityValue: unknown) { const activity = related(activityValue); const lesson = related(activity?.lessons); const topic = related(lesson?.topics); const unit = related(topic?.units); return `${String(unit?.code ?? "Course")} ${String(unit?.title ?? "starting point and learner background")} | ${String(topic?.title ?? "Topic not linked")}`; }
function assessmentDate(valueInput: unknown) { const row = related(valueInput); const instance = related(row?.assessment_instances); return textOrNull(instance?.completed_at) ?? textOrNull(row?.created_at); }
function isCourseStartingPointComparison(row: Row) {
  const skillTopic = related(related(row.skills)?.topics);
  const starting = related(row.starting_result);
  const instance = related(starting?.assessment_instances);
  const activity = related(instance?.activities);
  return String(skillTopic?.title ?? "").toLowerCase() === "course starting point"
    || String(activity?.title ?? "").toLowerCase().startsWith("course starting point");
}
function value(input: unknown, key: string) { return related(input)?.[key]; }
function related(input: unknown): Row | undefined { return Array.isArray(input) ? input[0] as Row | undefined : input && typeof input === "object" ? input as Row : undefined; }
function record(input: unknown): Row { return input && typeof input === "object" && !Array.isArray(input) ? input as Row : {}; }
function numberOrNull(input: unknown) { return input == null ? null : Number(input); }
function textOrNull(input: unknown) { return typeof input === "string" ? input : null; }
function uniqueTopicKeys(items: Row[]) {
  const seen = new Set<string>();
  return items.flatMap(item => {
    const unitCode = String(item.unit_code ?? "");
    const topicCode = String(item.topic_code ?? "");
    const key = `${unitCode}:${topicCode}`;
    if (!unitCode || !topicCode || seen.has(key)) return [];
    seen.add(key);
    return [{ unitCode, topicCode }];
  });
}
function worksheetExcerpt(input: unknown) {
  const responses = record(input);
  const selected = [
    ["Main task", responses.mainTask],
    ["Practical", responses.practicalApplication],
    ["Knowledge", responses.knowledgeCheck],
    ["Improvement", responses.improvement],
    ["Reflection", responses.todayCan],
    ["Exit ticket", responses.exitTicket],
  ].flatMap(([label, value]) => typeof value === "string" && value.trim() ? [`${label}: ${value.trim()}`] : []);
  const excerpt = selected.join(" | ");
  if (!excerpt) return "Artifact recorded; no reportable response excerpt is available.";
  return excerpt.length > 620 ? `${excerpt.slice(0, 617)}...` : excerpt;
}
function signed(input: unknown) { const number = Number(input); return `${number >= 0 ? "+" : ""}${number}`; }
function date(input: string | null | undefined) { return input ? new Date(input).toLocaleDateString("en-GB") : "Not scheduled"; }
function firstDate(inputs: (string | null)[]) { return date(inputs.filter((item): item is string => Boolean(item)).sort()[0]); }
function wrap(text: string, width: number) {
  const words = text.replace(/[^\x20-\x7E]/g, "-").split(/\s+/); const lines: string[] = []; let current = "";
  for (const word of words) { if ((current + " " + word).trim().length > width) { if (current) lines.push(current); current = word; } else current = (current + " " + word).trim(); }
  if (current) lines.push(current); return lines;
}

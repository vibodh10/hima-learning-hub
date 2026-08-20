import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  conciseCurrentJudgement, evidenceCounts, groupByTopic, hasValidComparableProgress,
  isPriorExperienceSkill, learnerReflectionLabel, reportTargetStatus, topicAssessmentStatus,
} from "./learner-report-model";

type Row = Record<string, unknown>;
export type ConciseReportEvidence = {
  learnerName: string; className: string; courseTitle: string; teacherName: string;
  enrolledAt: string | null; exportedAt: string;
  skills: Row[]; comparisons: Row[]; mastery: Row[]; attempts: Row[];
  targets: Row[]; feedback: Row[]; misconceptions: Row[]; teacherActions: Row[];
  snapshots: Row[]; retrieval: Row[]; badges: Row[]; coins: Row[];
  assessments: Row[]; overrides: Row[]; curriculumAttempts: Row[];
};

export async function buildConciseLearnerReportPdf(data: ConciseReportEvidence) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 790; let pageNumber = 1;
  const footer = () => {
    page.drawLine({ start: { x: 45, y: 38 }, end: { x: 550, y: 38 }, thickness: .5, color: rgb(.72, .77, .8) });
    page.drawText(`Hima Learning Hub | Individual Learner Report | Page ${pageNumber}`, { x: 45, y: 22, size: 8, font: regular, color: rgb(.32, .39, .43) });
  };
  const newPage = () => { footer(); page = pdf.addPage([595, 842]); pageNumber += 1; y = 790; };
  const ensure = (minimum: number) => { if (y < minimum) newPage(); };
  const line = (text: string, size = 9, strong = false, indent = 0) => {
    for (const part of wrap(text, Math.max(44, 100 - indent))) {
      if (y < 58) newPage();
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
  const active = data.targets.filter(item => ["approved", "active", "extended"].includes(String(item.status)));
  const achieved = data.targets.filter(item => item.status === "achieved");
  const nextReview = [...data.targets.map(item => textOrNull(item.review_on)), ...data.teacherActions.map(item => textOrNull(item.review_on))]
    .filter((value): value is string => Boolean(value)).sort().find(value => new Date(`${value}T23:59:59`) >= asAt) ?? null;

  line("Individual Learner Report", 20, true);
  line("Concise educational summary: starting point, progress, feedback and next steps", 10);

  heading(1, "Learner overview");
  line(`Learner: ${data.learnerName} | Course: ${data.courseTitle}`, 10, true);
  line(`Teacher: ${data.teacherName} | Enrolled: ${date(data.enrolledAt)} | Report date: ${date(data.exportedAt)}`);
  const partial = groups.filter(group => statusFor(group.items) === "Partially assessed").length;
  const established = groups.filter(group => statusFor(group.items) === "Baseline established").length;
  const progressed = groups.filter(group => statusFor(group.items) === "Progress point completed").length;
  line(`Starting point: ${partial} topic(s) partially assessed; ${established} baseline(s) established. Limited evidence is not a secure baseline.`);
  line(`Current progress: ${progressed ? `${progressed} topic(s) have comparable progress evidence.` : "No comparable progress-point assessment has been completed yet."}`);
  line(`Targets: ${active.length} active | ${achieved.length} achieved | Next review: ${date(nextReview)}.`);

  heading(2, "Starting-point summary by topic");
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
    line(`Next step: ${secure.length < group.items.length ? "Complete a fuller baseline assessment." : "Complete a comparable progress-point assessment."}`);
  });

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

  heading(6, "Reflection and evidence history");
  const latest = data.snapshots.find(item => item.learner_reflection) ?? data.snapshots[0];
  const snapshot = record(latest?.snapshot_data);
  line(`Latest learner reflection: ${learnerReflectionLabel(textOrNull(latest?.learner_reflection))}`);
  line(`Teacher response: ${String(snapshot.teacher_response ?? "No teacher response recorded.")}`);
  line(`Retrieval check date: ${date(textOrNull(data.retrieval.find(item => item.status !== "cancelled")?.scheduled_for))}.`);
  subheading("Recent assessment timeline");
  data.attempts.slice(-8).reverse().forEach(item => line(`${date(textOrNull(item.completed_at))} | ${parentFromActivity(item.activities)} | ${String(related(item.activities)?.title ?? "Activity")} | ${item.percentage}% | ${item.hints_used} hints.`, 8));

  subheading("Curriculum question sessions and papers");
  data.curriculumAttempts.slice(0,20).forEach(item=>{
    const submitted=Array.isArray(item.question_results)&&(item.question_results as Row[]).some(result=>typeof result.answer==="string");
    const outcome=submitted&&item.teacher_mark==null?"awaiting Hima review":`${item.mark}/${item.max_mark} (${Math.round(Number(item.percentage))}%)`;
    line(`${date(textOrNull(item.completed_at))} | Unit ${String(item.unit_code)} | ${String(item.topic_code??`${item.paper_mode??"applied"} paper`)} | ${outcome} | ${Number(item.hints_used)} hints | ${Math.round(Number(item.active_seconds)/60)} minutes.`,8);
    if(item.teacher_feedback)line(`Hima's feedback: ${String(item.teacher_feedback)} | reviewed ${date(textOrNull(item.reviewed_at))}.`,8,false,1);
  });
  if(!data.curriculumAttempts.length)line("No curriculum question sessions or papers recorded.",8);

  ensure(260); y -= 12;
  line("Detailed supporting evidence", 18, true);
  line("Appendix - historical and administrative records retained for review", 9);
  subheading("Full assessment history");
  data.assessments.forEach(item => line(`${date(textOrNull(item.completed_at))} | ${String(item.kind).replaceAll("_", " ")} | ${String(related(item.activities)?.title ?? "Assessment")}.`, 8));
  if (!data.assessments.length) line("No formal assessment history recorded.", 8);
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
  subheading("Evidence integrity and scope");
  line("Academic judgements use dated assessment evidence, mapped curriculum content, recorded support, teacher feedback and follow-up where available. Open-ended practical papers are not treated as finally marked until Hima records a review.",8);
  line("A missing record is shown as not recorded or not assessed; it is never converted into a progress claim. Rewards are reported separately from academic evidence.",8);
  line("This educational progress report supports inspection discussion but is not an Ofsted certificate. Attendance, safeguarding, SEND plans and statutory records remain in the centre's approved systems and must be considered alongside it.",8);
  footer();
  pdf.setTitle(`${data.learnerName} - Individual Learner Report`);
  pdf.setSubject("Concise starting-point, progress, feedback and target summary");
  pdf.setAuthor("Hima Learning Hub"); pdf.setCreator("Hima Learning Hub"); pdf.setCreationDate(asAt);
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
function signed(input: unknown) { const number = Number(input); return `${number >= 0 ? "+" : ""}${number}`; }
function date(input: string | null | undefined) { return input ? new Date(input).toLocaleDateString("en-GB") : "Not scheduled"; }
function firstDate(inputs: (string | null)[]) { return date(inputs.filter((item): item is string => Boolean(item)).sort()[0]); }
function wrap(text: string, width: number) {
  const words = text.replace(/[^\x20-\x7E]/g, "-").split(/\s+/); const lines: string[] = []; let current = "";
  for (const word of words) { if ((current + " " + word).trim().length > width) { if (current) lines.push(current); current = word; } else current = (current + " " + word).trim(); }
  if (current) lines.push(current); return lines;
}

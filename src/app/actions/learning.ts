"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { canCreateClass, canJoinClass, canSubmitPractice } from "@/lib/permissions";

export type ActionState = {
  ok?: boolean;
  message?: string;
  testData?: unknown;
  result?: {
    attemptId: string; mark: number; maxMark: number; percentage: number; pathway: string;
    feedback: { questionId: string; correct: boolean; mark: number; maxMark: number; correctAnswer: unknown; explanation: string }[];
    skillMastery?: { skillId: string; title: string; masteryScore: number; pathway: string }[];
    coinsAwarded?: number;
    badgesAwarded?: ({ code: string; title: string } | string)[];
  };
};

export async function runTestModeAction(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Test Mode is restricted to teachers and administrators."};
  const parsed=z.object({
    event:z.enum(["activity_opened","answer_revealed","simulated_correct","simulated_incorrect",
      "simulated_percentage","simulated_pathway","target_achieved","badge_awarded",
      "coins_awarded","reward_purchased","reward_equipped","confetti_previewed"]),
    activityId:z.union([databaseUuid,z.literal("")]),
    percentage:z.coerce.number().min(0).max(100).optional(),
    pathway:z.enum(["Support","Core","Stretch","Mastery"]).optional(),
    detail:z.string().trim().max(300).optional(),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"Choose a valid Test Mode simulation."};
  const supabase=await createClient();
  let testData:unknown;
  if(parsed.data.event==="answer_revealed"){
    if(!parsed.data.activityId)return{message:"Choose an activity before revealing its expected answers."};
    const{data,error}=await supabase.rpc("test_mode_expected_answers",{activity_uuid:parsed.data.activityId});
    if(error)return{message:"Expected answers could not be revealed in Test Mode."};
    testData=data;
  }
  const payload={
    activityId:parsed.data.activityId||null,percentage:parsed.data.percentage??null,
    pathway:parsed.data.pathway??null,detail:parsed.data.detail??null,
  };
  const{error}=await supabase.rpc("record_test_mode_event",{
    event_value:parsed.data.event,payload_value:payload,
  });
  if(error)return{message:"The Test Mode event could not be recorded."};
  return{ok:true,message:"Sandbox simulation recorded. No learner evidence was changed.",testData};
}

export async function resetTestMode(previousState:ActionState):Promise<ActionState>{
  void previousState;
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Test Mode is restricted to teachers and administrators."};
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("reset_test_mode");
  if(error)return{message:"The demo learner sandbox could not be reset."};
  return{ok:true,message:`Demo learner reset. ${Number(data)} sandbox event${Number(data)===1?"":"s"} removed.`};
}

export async function markBadgeNotificationsSeen(awardIds:string[]):Promise<void>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="student")return;
  const ids=awardIds.filter(id=>databaseUuid.safeParse(id).success).slice(0,20);
  if(!ids.length)return;
  const supabase=await createClient();
  await supabase.rpc("mark_badge_notifications_seen",{award_uuids:ids});
  revalidatePath("/dashboard");
}

const databaseUuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid database identifier.",
);
const classInput = z.object({
  className: z.string().trim().min(2).max(80),
  courseId: databaseUuid,
  academicYearId: databaseUuid,
  enrolmentCode: z.string().trim().min(6).max(24).regex(/^[a-zA-Z0-9-]+$/),
});

export async function createClass(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "You are not authorised to create a class." };
  const parsed = classInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check the class name, course, academic year and enrolment code." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_class", {
    class_name: parsed.data.className, course_uuid: parsed.data.courseId,
    academic_year_uuid: parsed.data.academicYearId, enrolment_code: parsed.data.enrolmentCode,
  });
  if (error) {
    console.error("create_class RPC failed", { code: error.code, message: error.message });
    return { message: "The class could not be created. Try a different enrolment code." };
  }
  revalidatePath("/dashboard");
  return { ok: true, message: "Class created. Share the enrolment code securely with your learners." };
}

export async function configureClass(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "Only teaching staff can configure classes." };
  const parsed = z.object({
    classId: databaseUuid,
    className: z.string().trim().min(2).max(80),
    academicPeriodId: databaseUuid,
    courseId: databaseUuid,
    activeUnitId: databaseUuid,
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    weeklyLearningDay: z.coerce.number().int().min(1).max(7),
  }).safeParse(Object.fromEntries(formData));
  const unitIds = formData.getAll("unitIds").map(String);
  if (!parsed.success || unitIds.length < 1 || !unitIds.every(id => databaseUuid.safeParse(id).success)
    || !unitIds.includes(parsed.data.activeUnitId)
    || parsed.data.endsOn < parsed.data.startsOn) {
    return { message: "Choose a period, course, at least one unit, an active unit, and valid class dates." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_configure_class", {
    class_uuid: parsed.data.classId, name_value: parsed.data.className,
    period_uuid: parsed.data.academicPeriodId, course_uuid: parsed.data.courseId,
    unit_uuids: unitIds, active_unit_uuid: parsed.data.activeUnitId,
    starts_value: parsed.data.startsOn, ends_value: parsed.data.endsOn,
    weekday_value: parsed.data.weeklyLearningDay,
    published_value: formData.get("published") === "on",
  });
  if (error) {
    console.error("teacher_configure_class failed", { code: error.code, message: error.message });
    return { message: "The class configuration could not be saved." };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  return { ok: true, message: "Class curriculum and schedule saved." };
}

export async function joinClass(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canJoinClass(actor.role)) return { message: "Only learner accounts can join a class." };
  const parsed = z.string().trim().min(6).max(24).safeParse(formData.get("enrolmentCode"));
  if (!parsed.success) return { message: "Enter the enrolment code provided by your teacher." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_class", { enrolment_code: parsed.data });
  if (error) return { message: "That code was not recognised for your organisation." };
  revalidatePath("/dashboard");
  return { ok: true, message: "You have joined the class." };
}

export async function submitPractice(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canSubmitPractice(actor.role)) return { message: "Only enrolled learners can submit practice." };
  const activityId = databaseUuid.safeParse(formData.get("activityId"));
  const hints = z.coerce.number().int().min(0).max(100).safeParse(formData.get("hintsUsed") ?? 0);
  const context=z.object({
    activeSeconds:z.coerce.number().int().min(1).max(21600),
    confidenceBefore:z.coerce.number().int().min(1).max(5),
    confidenceAfter:z.coerce.number().int().min(1).max(5),
    priorExperience:z.string().trim().max(1000),
    supportNeeds:z.string().trim().max(2000),
    aspirations:z.string().trim().max(2000),
  }).safeParse(Object.fromEntries(formData));
  if (!activityId.success || !hints.success || !context.success) return { message: "This practice submission is invalid." };
  const answers: Record<string, unknown> = {};
  for (const [key] of formData.entries()) {
    if (!key.startsWith("q_")) continue;
    const questionId = key.slice(2);
    const values = formData.getAll(key).map(String);
    answers[questionId] = values.length > 1 ? values : values[0];
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_activity", {
    activity_uuid: activityId.data, submitted_answers: answers, hint_count: hints.data,
  });
  if (error) {
    const known = error.message.includes("attempt_limit") ? "You have used all permitted attempts." :
      error.message.includes("activity_not_available") ? "This activity is not available to your account." :
      "Your answers could not be saved. No result has been recorded.";
    return { message: known };
  }
  const result=data as NonNullable<ActionState["result"]>;
  const {error:contextError}=await supabase.rpc("record_attempt_context",{
    attempt_uuid:result.attemptId,active_seconds_value:context.data.activeSeconds,
    confidence_before_value:context.data.confidenceBefore,
    confidence_after_value:context.data.confidenceAfter,
    prior_experience_value:{summary:context.data.priorExperience},
    support_needs_value:context.data.supportNeeds,
    aspirations_value:context.data.aspirations,
  });
  if(contextError)console.error("record_attempt_context failed",{code:contextError.code,message:contextError.message});
  const{data:additionalBadges,error:badgeError}=await supabase.rpc("evaluate_attempt_badges",{
    attempt_uuid:result.attemptId,
  });
  if(badgeError)console.error("evaluate_attempt_badges failed",{code:badgeError.code,message:badgeError.message});
  if(Array.isArray(additionalBadges)&&additionalBadges.length){
    result.badgesAwarded=[...(result.badgesAwarded??[]),...(additionalBadges as {code:string;title:string}[])];
  }
  const{data:coinAdjustment,error:coinRuleError}=await supabase.rpc("apply_configured_coin_rules",{
    attempt_uuid:result.attemptId,
  });
  if(coinRuleError)console.error("apply_configured_coin_rules failed",{code:coinRuleError.code,message:coinRuleError.message});
  if(typeof coinAdjustment==="number")result.coinsAwarded=(result.coinsAwarded??0)+coinAdjustment;
  revalidatePath("/dashboard");
  return { ok: true, result };
}

export async function purchaseReward(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || actor.role !== "student") return { message: "Only learner accounts can purchase cosmetic rewards." };
  const rewardId = databaseUuid.safeParse(formData.get("rewardId"));
  if (!rewardId.success) return { message: "That reward is not available." };
  const supabase = await createClient();
  const {data,error } = await supabase.rpc("purchase_reward_v2", { reward_uuid: rewardId.data });
  if (error) {
    const known = error.message.includes("insufficient_coins") ? "You do not have enough gold coins for this reward." :
      error.message.includes("already_owned") ? "You already own this reward." :
      "The reward could not be purchased.";
    return { message: known };
  }
  revalidatePath("/rewards");
  revalidatePath("/dashboard");
  return { ok: true, message: "Cosmetic reward purchased and added to your collection.",testData:data };
}

export async function equipReward(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="student")return{message:"Only learner accounts can equip cosmetic rewards."};
  const parsed=z.object({purchaseId:databaseUuid,equip:z.enum(["true","false"])}).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"That owned reward could not be selected."};
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("equip_reward",{
    purchase_uuid:parsed.data.purchaseId,equip_value:parsed.data.equip==="true",
  });
  if(error)return{message:"The cosmetic selection could not be saved."};
  revalidatePath("/rewards");revalidatePath("/dashboard");
  return{ok:true,message:parsed.data.equip==="true"?"Reward equipped and applied.":"Reward unequipped.",testData:data};
}

export async function reconcileRewardPurchases(previousState:ActionState):Promise<ActionState>{
  void previousState;
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="administrator")return{message:"Only administrators can reconcile incomplete reward purchases."};
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("reconcile_incomplete_reward_purchases",{learner_uuid:null});
  if(error)return{message:"The reconciliation check could not be completed."};
  revalidatePath("/admin");
  return{ok:true,message:Number(data)>0
    ?`${Number(data)} incomplete purchase${Number(data)===1?"":"s"} refunded with ledger entries.`
    :"No incomplete reward purchases required a refund."};
}

export async function overrideActivityLock(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teachers and administrators can override an activity lock."};
  const parsed=z.object({
    learnerId:databaseUuid,activityId:databaseUuid,
    reason:z.string().trim().min(5).max(500),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"Choose an activity and provide a clear educational reason."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_override_activity_lock",{
    learner_uuid:parsed.data.learnerId,activity_uuid:parsed.data.activityId,
    reason_value:parsed.data.reason,expires_value:null,
  });
  if(error)return{message:"The lock override could not be recorded."};
  revalidatePath(`/teacher/learners/${parsed.data.learnerId}`);
  return{ok:true,message:"Activity unlocked and the override was added to the audit log."};
}

const contentStatus = z.enum(["draft", "approved", "archived"]);
const pathway = z.enum(["Support", "Core", "Stretch", "Mastery"]);

export async function saveLesson(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "Only teaching staff can manage lessons." };
  const parsed = z.object({
    lessonId: z.union([databaseUuid, z.literal("")]).transform(value => value || null),
    topicId: databaseUuid,
    weekNumber: z.coerce.number().int().min(1).max(60),
    title: z.string().trim().min(3).max(160),
    learn: z.string().trim().min(10).max(5000),
    remember: z.string().trim().max(1000),
    workedExample: z.string().trim().min(5).max(5000),
    reflection: z.string().trim().max(1000),
    language: z.string().trim().max(60),
    objectives: z.string().trim().max(3000),
    minutes: z.coerce.number().int().min(5).max(240),
    status: contentStatus,
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check the lesson title, content, topic, duration and status." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_save_lesson", {
    lesson_uuid: parsed.data.lessonId, topic_uuid: parsed.data.topicId, week_value: parsed.data.weekNumber,
    title_value: parsed.data.title, learn_value: parsed.data.learn, remember_value: parsed.data.remember,
    worked_example_value: parsed.data.workedExample, reflection_value: parsed.data.reflection,
    language_value: parsed.data.language,
    objectives_value: parsed.data.objectives.split(/\r?\n/).map(value => value.trim()).filter(Boolean),
    minutes_value: parsed.data.minutes, status_value: parsed.data.status,
  });
  if (error) return { message: "The lesson could not be saved. Check that its topic and week are unique." };
  revalidatePath("/teacher/content");
  revalidatePath("/dashboard");
  return { ok: true, message: "Lesson saved." };
}

export async function createQuestion(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "Only teaching staff can manage questions." };
  const parsed = z.object({
    activityId: databaseUuid, skillId: databaseUuid,
    kind: z.enum([
      "single_choice","multiple_response","true_false","matching","ordering",
      "fill_blank","short_text","numeric","code_output","code_completion",
      "identify_error","correct_code","pseudocode_ordering","sql_completion",
      "html_css_completion","javascript_completion","scenario","scenario_decision",
      "confidence","reflection","extended_response",
    ]),
    pathway, question: z.string().trim().min(5).max(5000), correctAnswer: z.string().trim().min(1).max(5000),
    alternatives: z.string().trim().max(5000), options: z.string().trim().max(5000),
    explanation: z.string().trim().min(5).max(5000), feedbackCorrect: z.string().trim().min(2).max(2000),
    feedbackIncorrect: z.string().trim().min(2).max(2000), hint: z.string().trim().max(2000),
    marks: z.coerce.number().positive().max(100), seconds: z.coerce.number().int().min(10).max(3600),
    status: z.enum(["draft", "approved"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check every required question-bank field." };
  const answer = parseAnswer(parsed.data.correctAnswer);
  const alternatives = splitLines(parsed.data.alternatives);
  const options = splitLines(parsed.data.options);
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_create_question", {
    activity_uuid: parsed.data.activityId, skill_uuid: parsed.data.skillId,
    kind_value: parsed.data.kind, pathway_value: parsed.data.pathway,
    question_value: parsed.data.question, correct_value: answer,
    alternatives_value: alternatives, explanation_value: parsed.data.explanation,
    feedback_correct_value: parsed.data.feedbackCorrect, feedback_incorrect_value: parsed.data.feedbackIncorrect,
    hint_value: parsed.data.hint, marks_value: parsed.data.marks, seconds_value: parsed.data.seconds,
    options_value: options, status_value: parsed.data.status,
  });
  if (error) return { message: "The question could not be added. Check its kind, answer and selected activity." };
  revalidatePath("/teacher/content");
  return { ok: true, message: `Question saved as ${parsed.data.status}.` };
}

export async function setContentStatus(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "Only teaching staff can approve content." };
  const parsed = z.object({ entity: z.enum(["lesson", "activity", "question"]), entityId: databaseUuid, status: contentStatus }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Invalid content status change." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_set_content_status", {
    entity_value: parsed.data.entity, entity_uuid: parsed.data.entityId, status_value: parsed.data.status,
  });
  if (error) return { message: "The content status could not be changed." };
  revalidatePath("/teacher/content");
  return { ok: true, message: `Content moved to ${parsed.data.status}.` };
}

export async function allocateActivity(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "Only teaching staff can allocate learning." };
  const parsed = z.object({
    activityId: databaseUuid, classId: databaseUuid, pathway,
    releaseAt: z.string().min(1), deadlineAt: z.string().min(1),
    required: z.string().optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || new Date(parsed.data.deadlineAt) <= new Date(parsed.data.releaseAt)) return { message: "Choose an activity, class, pathway, release time and a later deadline." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_allocate_activity", {
    activity_uuid: parsed.data.activityId, class_uuid: parsed.data.classId, learner_uuid: null,
    pathway_value: parsed.data.pathway, release_value: new Date(parsed.data.releaseAt).toISOString(),
    deadline_value: new Date(parsed.data.deadlineAt).toISOString(), required_value: parsed.data.required === "on",
  });
  if (error) return { message: "The activity could not be allocated to that class." };
  revalidatePath("/teacher/content");
  return { ok: true, message: "Activity allocated." };
}

export async function setGamification(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "Only teaching staff can change these settings." };
  const classId = databaseUuid.safeParse(formData.get("classId"));
  if (!classId.success) return { message: "Choose a class." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_set_gamification", {
    class_uuid: classId.data, learner_uuid: null,
    badges_value: formData.get("badges") === "on", coins_value: formData.get("coins") === "on",
    streaks_value: formData.get("streaks") === "on",
  });
  if (error) return { message: "Gamification settings could not be updated." };
  revalidatePath("/teacher/content");
  return { ok: true, message: "Class gamification settings updated." };
}

export async function updateTarget(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "Only teaching staff can review targets." };
  const parsed = z.object({
    targetId: databaseUuid,
    status: z.enum(["proposed","approved","active","achieved","partially_achieved","not_achieved","extended","replaced","archived"]),
    targetText: z.string().trim().min(10).max(1000),
    teacherNote: z.string().trim().max(1000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Check the target text, status and note." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_update_target", {
    target_uuid: parsed.data.targetId, status_value: parsed.data.status,
    target_text_value: parsed.data.targetText, note_value: parsed.data.teacherNote,
  });
  if (error) return { message: "The target could not be updated." };
  revalidatePath("/teacher/learners");
  return { ok: true, message: "Target updated." };
}

export async function adjustCoins(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "Only teaching staff can correct coin records." };
  const parsed = z.object({
    learnerId: databaseUuid, amount: z.coerce.number().int().min(-500).max(500).refine(value => value !== 0),
    note: z.string().trim().min(5).max(500),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Enter a non-zero correction and a clear audit note." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_adjust_coins", {
    learner_uuid: parsed.data.learnerId, amount_value: parsed.data.amount, note_value: parsed.data.note,
  });
  if (error) return { message: "The coin correction could not be recorded." };
  revalidatePath("/teacher/learners");
  return { ok: true, message: "Coin correction recorded in the audit ledger." };
}

export async function recordTeacherAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "Only teaching staff can record actions." };
  const parsed = z.object({
    classId: databaseUuid, learnerId: databaseUuid,
    action: z.string().trim().min(3).max(120),
    reason: z.string().trim().min(3).max(1000),
    reviewOn: z.union([z.iso.date(), z.literal("")]),
    outcome: z.string().trim().max(1000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Choose an action and record the evidence-based reason." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_record_action", {
    class_uuid: parsed.data.classId, learner_uuid: parsed.data.learnerId,
    action_value: parsed.data.action, reason_value: parsed.data.reason,
    review_value: parsed.data.reviewOn || null, outcome_value: parsed.data.outcome,
    metadata_value: {},
  });
  if (error) return { message: "The teacher action could not be recorded." };
  revalidatePath(`/teacher/learners/${parsed.data.learnerId}`);
  return { ok: true, message: "Teacher action added to the learner evidence chain." };
}

export async function overridePathway(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "Only teaching staff can override pathways." };
  const parsed = z.object({
    learnerId: databaseUuid, skillId: databaseUuid, newPathway: pathway,
    reason: z.string().trim().min(5).max(1000), reviewOn: z.iso.date(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Choose a skill, pathway, reason and future review date." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_override_pathway", {
    learner_uuid: parsed.data.learnerId, skill_uuid: parsed.data.skillId,
    topic_uuid: null, new_value: parsed.data.newPathway,
    reason_value: parsed.data.reason, review_value: parsed.data.reviewOn,
  });
  if (error) return { message: "The pathway override could not be saved." };
  revalidatePath(`/teacher/learners/${parsed.data.learnerId}`);
  return { ok: true, message: "Pathway override recorded with its review date." };
}

export async function createProgressSnapshot(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await getSessionProfile();
  if (!actor || !canCreateClass(actor.role)) return { message: "Only teaching staff can create snapshots." };
  const parsed = z.object({
    learnerId: databaseUuid, classId: databaseUuid, academicPeriodId: databaseUuid,
    reflection: z.string().trim().max(2000), nextPriorities: z.string().trim().min(5).max(2000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Choose an academic period and add clear next priorities." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_create_progress_snapshot", {
    learner_uuid: parsed.data.learnerId, class_uuid: parsed.data.classId,
    period_uuid: parsed.data.academicPeriodId, reflection_value: parsed.data.reflection,
    next_value: parsed.data.nextPriorities,
  });
  if (error) {
    const message=error.code==="23505" ? "A permanent snapshot already exists for this learner and period." : "The progress snapshot could not be created.";
    return { message };
  }
  revalidatePath(`/teacher/learners/${parsed.data.learnerId}`);
  return { ok: true, message: "Permanent academic-period snapshot created." };
}

export async function duplicateClass(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teaching staff can duplicate classes."};
  const parsed=z.object({
    sourceClassId:databaseUuid,newName:z.string().trim().min(2).max(80),
    enrolmentCode:z.string().trim().min(6).max(24).regex(/^[a-zA-Z0-9-]+$/),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"Enter a new class name and secure enrolment code."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_duplicate_class",{
    source_class_uuid:parsed.data.sourceClassId,new_name:parsed.data.newName,
    enrolment_code:parsed.data.enrolmentCode,
  });
  if(error)return{message:"The class structure could not be duplicated."};
  revalidatePath("/dashboard");
  return{ok:true,message:"Class structure duplicated without copying learner results."};
}

export async function importExistingStudents(_: ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teaching staff can import learners."};
  const classId=databaseUuid.safeParse(formData.get("classId"));
  const emails=String(formData.get("emails")??"").split(/[\r\n,;]+/).map(value=>value.trim().toLowerCase()).filter(Boolean);
  const filename=z.string().trim().max(255).safeParse(formData.get("filename")??"pasted-learner-list.csv");
  if(!classId.success||!filename.success||emails.length<1||emails.length>500||emails.some(email=>!z.email().safeParse(email).success))return{message:"Provide between 1 and 500 valid learner email addresses."};
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("teacher_import_existing_students",{
    class_uuid:classId.data,emails_value:emails,filename_value:filename.data,
  });
  if(error)return{message:"The learner import could not be completed."};
  const result=data as {imported:number;failures:unknown[]};
  revalidatePath(`/teacher/classes/${classId.data}`);
  return{ok:true,message:`Imported ${result.imported} learner${result.imported===1?"":"s"}; ${result.failures.length} row${result.failures.length===1?"":"s"} could not be matched.`};
}

export async function allocateAdaptiveHomework(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teaching staff can allocate homework."};
  const parsed=z.object({
    classId:databaseUuid,topicId:databaseUuid,
    pathwayMode:z.enum(["Auto","Support","Core","Stretch","Mastery"]),
    releaseAt:z.string().min(1),deadlineAt:z.string().min(1),
    expectedMinutes:z.coerce.number().int().min(5).max(120),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success||new Date(parsed.data.deadlineAt)<=new Date(parsed.data.releaseAt))return{message:"Choose a topic, pathway mode, duration, release time and later deadline."};
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("teacher_allocate_adaptive_homework",{
    topic_uuid:parsed.data.topicId,class_uuid:parsed.data.classId,learner_uuid:null,
    pathway_mode:parsed.data.pathwayMode,
    release_value:new Date(parsed.data.releaseAt).toISOString(),
    deadline_value:new Date(parsed.data.deadlineAt).toISOString(),
    expected_minutes_value:parsed.data.expectedMinutes,
    required_value:formData.get("required")==="on",
  });
  if(error)return{message:"Adaptive homework could not be allocated. Confirm that approved pathway activities exist."};
  const result=data as {count:number};
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  revalidatePath("/dashboard");
  return{ok:true,message:`Adaptive homework allocated to ${result.count} learner${result.count===1?"":"s"}.`};
}

export async function createTeacherTarget(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teaching staff can create targets."};
  const parsed=z.object({
    learnerId:databaseUuid,classId:databaseUuid,
    level:z.enum(["weekly","topic","unit","term_semester"]),
    targetText:z.string().trim().min(15).max(1000),
    reason:z.string().trim().min(5).max(1000),
    startsOn:z.iso.date(),deadline:z.iso.date(),reviewOn:z.iso.date(),
    successMeasure:z.string().trim().min(5).max(1000),
    teacherNote:z.string().trim().max(1000),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success||parsed.data.deadline<parsed.data.startsOn||parsed.data.reviewOn<parsed.data.startsOn)return{message:"Create a measurable target with valid start, deadline and review dates."};
  const optionalId=(name:string)=>{const value=String(formData.get(name)??"");return databaseUuid.safeParse(value).success?value:null};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_create_target",{
    learner_uuid:parsed.data.learnerId,class_uuid:parsed.data.classId,
    level_value:parsed.data.level,unit_uuid:optionalId("unitId"),
    topic_uuid:optionalId("topicId"),skill_uuid:optionalId("skillId"),
    target_text_value:parsed.data.targetText,reason_value:parsed.data.reason,
    evidence_value:{source:"teacher_review"},starts_value:parsed.data.startsOn,
    deadline_value:parsed.data.deadline,review_value:parsed.data.reviewOn,
    success_value:parsed.data.successMeasure,note_value:parsed.data.teacherNote,
  });
  if(error)return{message:"The target could not be created for this learner."};
  revalidatePath(`/teacher/learners/${parsed.data.learnerId}`);
  return{ok:true,message:"Measurable, time-limited target created and approved."};
}

export async function saveWeeklyPlan(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teaching staff can manage weekly plans."};
  const parsed=z.object({
    classId:databaseUuid,weekStart:z.iso.date(),
    title:z.string().trim().min(3).max(160),
    homeSessions:z.coerce.number().int().min(0).max(7),
    releaseAt:z.string().min(1),deadlineAt:z.string().min(1),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success||new Date(parsed.data.deadlineAt)<=new Date(parsed.data.releaseAt))return{message:"Choose the week, expectations, release and later deadline."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_save_weekly_plan",{
    class_uuid:parsed.data.classId,week_start_value:parsed.data.weekStart,
    title_value:parsed.data.title,home_sessions_value:parsed.data.homeSessions,
    retrieval_value:formData.get("retrievalRequired")==="on",
    release_value:new Date(parsed.data.releaseAt).toISOString(),
    deadline_value:new Date(parsed.data.deadlineAt).toISOString(),
  });
  if(error)return{message:"The weekly plan could not be saved."};
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  return{ok:true,message:"Weekly classroom, homework and retrieval expectations saved."};
}

export async function updateAdminSettings(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="administrator")return{message:"Administrator access is required."};
  const parsed=z.object({
    learnerEvidenceYears:z.coerce.number().int().min(1).max(25),
    auditLogYears:z.coerce.number().int().min(1).max(25),
    archivedClassYears:z.coerce.number().int().min(1).max(25),
    organisationLabel:z.string().trim().max(160),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"Retention periods must be between 1 and 25 years."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("admin_update_settings",{
    settings_value:{organisationLabel:parsed.data.organisationLabel},
    learner_years:parsed.data.learnerEvidenceYears,
    audit_years:parsed.data.auditLogYears,class_years:parsed.data.archivedClassYears,
    deletion_approval:formData.get("deletionRequiresApproval")==="on",
  });
  if(error)return{message:"System settings could not be updated."};
  revalidatePath("/admin");
  return{ok:true,message:"System and retention settings updated with an audit record."};
}

export async function setPathwayThresholds(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teaching staff can change pathway thresholds."};
  const parsed=z.object({
    classId:databaseUuid,supportMax:z.coerce.number().min(0).max(99),
    coreMax:z.coerce.number().min(1).max(99),stretchMax:z.coerce.number().min(1).max(99),
    hintsWeight:z.coerce.number().min(0).max(20),
    repeatedErrorWeight:z.coerce.number().min(0).max(20),
    confidenceWeight:z.coerce.number().min(0).max(20),
    retentionWeight:z.coerce.number().min(0).max(50),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success||!(parsed.data.supportMax<parsed.data.coreMax&&parsed.data.coreMax<parsed.data.stretchMax))return{message:"Thresholds must increase from Support to Core to Stretch and remain below 100."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_set_pathway_thresholds",{
    class_uuid:parsed.data.classId,support_max_value:parsed.data.supportMax,
    core_max_value:parsed.data.coreMax,stretch_max_value:parsed.data.stretchMax,
    hints_weight_value:parsed.data.hintsWeight,
    repeated_error_weight_value:parsed.data.repeatedErrorWeight,
    confidence_weight_value:parsed.data.confidenceWeight,
    retention_weight_value:parsed.data.retentionWeight,
  });
  if(error)return{message:"Pathway thresholds could not be saved."};
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  return{ok:true,message:"Class pathway thresholds and evidence weights saved."};
}

export async function archiveClass(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teaching staff can archive classes."};
  const classId=databaseUuid.safeParse(formData.get("classId"));
  const confirmation=z.literal("ARCHIVE").safeParse(String(formData.get("confirmation")??"").trim().toUpperCase());
  if(!classId.success||!confirmation.success)return{message:"Type ARCHIVE to confirm."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_archive_class",{class_uuid:classId.data});
  if(error)return{message:"The class could not be archived."};
  revalidatePath("/dashboard");
  return{ok:true,message:"Class and active enrolments archived. Historical results remain preserved."};
}

export async function addClassTeacher(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teaching staff can add co-teachers."};
  const parsed=z.object({classId:databaseUuid,teacherId:databaseUuid}).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"Choose a teacher."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_add_class_teacher",{
    class_uuid:parsed.data.classId,teacher_uuid:parsed.data.teacherId,is_lead_value:false,
  });
  if(error)return{message:"The co-teacher could not be added."};
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  return{ok:true,message:"Co-teacher added with authorised class access."};
}

export async function moveStudent(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teaching staff can move learners."};
  const parsed=z.object({
    learnerId:databaseUuid,fromClassId:databaseUuid,toClassId:databaseUuid,
    reason:z.string().trim().min(3).max(500),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success||parsed.data.fromClassId===parsed.data.toClassId)return{message:"Choose another authorised class and record the reason."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_move_student",{
    learner_uuid:parsed.data.learnerId,from_class_uuid:parsed.data.fromClassId,
    to_class_uuid:parsed.data.toClassId,reason_value:parsed.data.reason,
  });
  if(error)return{message:"The learner could not be moved to that class."};
  revalidatePath(`/teacher/classes/${parsed.data.fromClassId}`);
  revalidatePath(`/teacher/classes/${parsed.data.toClassId}`);
  return{ok:true,message:"Learner moved. All earlier results remain in their evidence history."};
}

export async function archiveEnrolment(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teaching staff can archive enrolments."};
  const parsed=z.object({
    learnerId:databaseUuid,classId:databaseUuid,
    reason:z.string().trim().min(3).max(500),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"Record a reason for archiving this enrolment."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_archive_enrolment",{
    learner_uuid:parsed.data.learnerId,class_uuid:parsed.data.classId,
    reason_value:parsed.data.reason,
  });
  if(error)return{message:"The enrolment could not be archived."};
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  return{ok:true,message:"Enrolment archived. The learner’s historical evidence remains preserved."};
}

export async function updateBadgeDefinition(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="administrator")return{message:"Administrator access is required."};
  const parsed=z.object({
    badgeId:databaseUuid,
    description:z.string().trim().min(3).max(500),
    criteria:z.string().trim().min(2).max(4000),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"Add a badge description and valid criteria."};
  let criteria:unknown;
  try{criteria=JSON.parse(parsed.data.criteria)}catch{return{message:"Badge criteria must be valid JSON."}}
  if(!criteria||Array.isArray(criteria)||typeof criteria!=="object")return{message:"Badge criteria must be a JSON object."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("admin_update_badge_definition",{
    badge_uuid:parsed.data.badgeId,description_value:parsed.data.description,
    criteria_value:criteria,enabled_value:formData.get("enabled")==="on",
  });
  if(error)return{message:"The badge configuration could not be saved."};
  revalidatePath("/admin");
  return{ok:true,message:"Badge criteria updated with an audit record."};
}

export async function setCoinRules(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only teaching staff can change coin rules."};
  const parsed=z.object({
    classId:databaseUuid,
    requiredLearning:z.coerce.number().int().min(0).max(100),
    onTime:z.coerce.number().int().min(0).max(100),
    improvement:z.coerce.number().int().min(0).max(100),
    retrieval:z.coerce.number().int().min(0).max(100),
    mastery:z.coerce.number().int().min(0).max(100),
    optionalChallenge:z.coerce.number().int().min(0).max(100),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"Coin awards must be whole numbers from 0 to 100."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_set_coin_rules",{
    class_uuid:parsed.data.classId,
    rules_value:{
      required_learning:parsed.data.requiredLearning,on_time:parsed.data.onTime,
      improvement:parsed.data.improvement,retrieval:parsed.data.retrieval,
      skill_mastery:parsed.data.mastery,optional_challenge:parsed.data.optionalChallenge,
    },
  });
  if(error)return{message:"Coin rules could not be saved."};
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  return{ok:true,message:"Secure server-side coin rules saved for this class."};
}

export async function manageProfile(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="administrator")return{message:"Administrator access is required."};
  const parsed=z.object({
    profileId:databaseUuid,
    role:z.enum(["student","teacher","administrator"]),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"Choose a valid user role."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("admin_manage_profile",{
    profile_uuid:parsed.data.profileId,role_value:parsed.data.role,
    archived_value:formData.get("archived")==="on",
  });
  if(error)return{message:"The user account could not be updated. You cannot remove your own administrator access."};
  revalidatePath("/admin");
  return{ok:true,message:"User role and access status updated with an audit record."};
}

export async function createAcademicYear(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="administrator")return{message:"Administrator access is required."};
  const parsed=z.object({
    name:z.string().trim().min(3).max(80),
    startsOn:z.iso.date(),endsOn:z.iso.date(),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success||parsed.data.endsOn<=parsed.data.startsOn)return{message:"Enter a name and valid academic-year dates."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("admin_create_academic_year",{
    name_value:parsed.data.name,starts_value:parsed.data.startsOn,ends_value:parsed.data.endsOn,
  });
  if(error)return{message:"The academic year could not be created. Its name may already exist."};
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return{ok:true,message:"Academic year created."};
}

export async function setAcademicYearStatus(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="administrator")return{message:"Administrator access is required."};
  const yearId=databaseUuid.safeParse(formData.get("yearId"));
  if(!yearId.success)return{message:"Invalid academic year."};
  const archived=String(formData.get("action"))==="archive";
  const supabase=await createClient();
  const{error}=await supabase.rpc("admin_archive_academic_year",{year_uuid:yearId.data,archived_value:archived});
  if(error)return{message:"The academic-year status could not be changed."};
  revalidatePath("/admin");
  return{ok:true,message:archived?"Academic year archived.":"Academic year restored."};
}

export async function createCurriculumVersion(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="administrator")return{message:"Administrator access is required."};
  const parsed=z.object({
    courseId:databaseUuid,label:z.string().trim().min(1).max(80),
    specificationYear:z.coerce.number().int().min(2000).max(2200),
    sourceReference:z.string().trim().max(500),
    teacherNotes:z.string().trim().max(1000),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"Choose a course and enter valid specification details."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("admin_create_curriculum_version",{
    course_uuid:parsed.data.courseId,label_value:parsed.data.label,
    year_value:parsed.data.specificationYear,source_value:parsed.data.sourceReference,
    notes_value:parsed.data.teacherNotes,
  });
  if(error)return{message:"The curriculum version could not be created. Use a unique version label."};
  revalidatePath("/admin");
  return{ok:true,message:"New active curriculum version created; the previous version was archived without changing historical evidence."};
}

export async function setCurriculumVersionStatus(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="administrator")return{message:"Administrator access is required."};
  const versionId=databaseUuid.safeParse(formData.get("versionId"));
  if(!versionId.success)return{message:"Invalid curriculum version."};
  const active=String(formData.get("action"))==="activate";
  const supabase=await createClient();
  const{error}=await supabase.rpc("admin_set_curriculum_version_status",{version_uuid:versionId.data,active_value:active});
  if(error)return{message:"The curriculum-version status could not be changed."};
  revalidatePath("/admin");
  return{ok:true,message:active?"Curriculum version activated.":"Curriculum version archived."};
}

export async function setCourseStatus(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="administrator")return{message:"Administrator access is required."};
  const courseId=databaseUuid.safeParse(formData.get("courseId"));
  if(!courseId.success)return{message:"Invalid course."};
  const active=String(formData.get("action"))==="activate";
  const supabase=await createClient();
  const{error}=await supabase.rpc("admin_set_course_status",{course_uuid:courseId.data,active_value:active});
  if(error)return{message:"The course status could not be changed."};
  revalidatePath("/admin");
  return{ok:true,message:active?"Course restored.":"Course archived; historical curriculum and results remain preserved."};
}

export async function requestLearnerDataDeletion(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="administrator")return{message:"Administrator access is required."};
  const parsed=z.object({
    learnerId:databaseUuid,
    reason:z.string().trim().min(10).max(1000),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success)return{message:"Record a clear authorised reason of at least 10 characters."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("admin_request_learner_data_deletion",{
    learner_uuid:parsed.data.learnerId,reason_value:parsed.data.reason,
  });
  if(error)return{message:"The deletion request could not be created, or one is already pending."};
  revalidatePath("/admin");
  return{ok:true,message:"Deletion request created. Review the export before completing the separate confirmation step."};
}

export async function executeLearnerDataDeletion(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="administrator")return{message:"Administrator access is required."};
  const parsed=z.object({
    requestId:databaseUuid,
    confirmation:z.literal("DELETE LEARNER DATA"),
  }).safeParse({
    requestId:formData.get("requestId"),
    confirmation:String(formData.get("confirmation")??"").trim().toUpperCase(),
  });
  if(!parsed.success)return{message:"Type DELETE LEARNER DATA exactly to confirm the authorised deletion."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("admin_execute_learner_data_deletion",{
    request_uuid:parsed.data.requestId,confirmation_value:parsed.data.confirmation,
  });
  if(error)return{message:"Deletion could not be completed. Check that the request is still pending."};
  revalidatePath("/admin");
  return{ok:true,message:"Learner account and personal learning data deleted; authorisation and audit evidence retained."};
}

export async function reviewFormativeResponse(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only authorised teaching staff can review formative responses."};
  const parsed=z.object({
    reviewId:databaseUuid,
    learnerId:databaseUuid,
    mark:z.coerce.number().min(0).max(1000),
    maxMark:z.coerce.number().positive().max(1000),
    feedback:z.string().trim().min(3).max(2000),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success||parsed.data.mark>parsed.data.maxMark)return{message:"Enter a mark within the available marks and clear formative feedback."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_review_formative_response",{
    review_uuid:parsed.data.reviewId,mark_value:parsed.data.mark,
    feedback_value:parsed.data.feedback,
    return_for_practice:formData.get("returnForPractice")==="on",
  });
  if(error)return{message:"The formative response could not be reviewed."};
  revalidatePath(`/teacher/learners/${parsed.data.learnerId}`);
  return{ok:true,message:"Formative mark and feedback saved; the learner’s progress evidence was recalculated."};
}

export async function createAssessmentBlueprint(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only authorised teaching staff can create assessment blueprints."};
  const parsed=z.object({
    curriculumVersionId:databaseUuid,
    title:z.string().trim().min(3).max(160),
    scope:z.enum(["course_starting_point","unit_starting_point","progress_point","retention_check"]),
    status:z.enum(["draft","approved"]),
  }).safeParse(Object.fromEntries(formData));
  const unitValue=String(formData.get("unitId")??"");
  const unitId=databaseUuid.safeParse(unitValue).success?unitValue:null;
  if(!parsed.success||(parsed.data.scope!=="course_starting_point"&&!unitId))return{message:"Choose a curriculum version, scope, title, and unit where required."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_create_assessment_blueprint",{
    curriculum_version_uuid:parsed.data.curriculumVersionId,unit_uuid:unitId,
    title_value:parsed.data.title,scope_value:parsed.data.scope,status_value:parsed.data.status,
  });
  if(error)return{message:"The assessment blueprint could not be created."};
  revalidatePath("/teacher/content");
  return{ok:true,message:"Assessment blueprint created. Map comparable questions to its skills and categories."};
}

export async function createActivity(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only authorised teaching staff can create activities."};
  const parsed=z.object({
    lessonId:databaseUuid,title:z.string().trim().min(3).max(160),
    kind:z.enum(["in_class_learning","in_class_practice","homework","revision","holiday_work","skills_practice","review_check"]),
    stage:z.enum(["learn","worked_example","guided_practice","core_practice","challenge_practice","mastery_check","retrieval_review"]),
    pathway:z.enum(["Support","Core","Stretch","Mastery"]),
    estimatedMinutes:z.coerce.number().int().min(1).max(240),
    maxAttempts:z.coerce.number().int().min(1).max(20),
    status:z.enum(["draft","approved"]),
    instructions:z.string().trim().max(2000),
    homeSession:z.union([z.coerce.number().int().min(1).max(20),z.literal("")]),
    assessmentKind:z.enum(["","course_starting_point","unit_starting_point","progress_point","retention_check"]),
  }).safeParse(Object.fromEntries(formData));
  const blueprintValue=String(formData.get("blueprintId")??"");
  const blueprintId=databaseUuid.safeParse(blueprintValue).success?blueprintValue:null;
  if(!parsed.success||(parsed.data.assessmentKind&&!blueprintId))return{message:"Check the lesson, activity settings, and approved assessment blueprint where required."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_create_activity",{
    lesson_uuid:parsed.data.lessonId,title_value:parsed.data.title,
    kind_value:parsed.data.kind,stage_value:parsed.data.stage,
    pathway_value:parsed.data.pathway,estimated_minutes_value:parsed.data.estimatedMinutes,
    max_attempts_value:parsed.data.maxAttempts,required_value:formData.get("required")==="on",
    automatic_marking_value:formData.get("automaticMarking")==="on",
    status_value:parsed.data.status,instructions_value:parsed.data.instructions,
    home_session_value:parsed.data.homeSession===""?null:parsed.data.homeSession,
    assessment_kind_value:parsed.data.assessmentKind,blueprint_uuid:blueprintId,
  });
  if(error)return{message:"The activity could not be created. Confirm that its assessment blueprint matches its purpose."};
  revalidatePath("/teacher/content");
  return{ok:true,message:"Formative activity created. Add skill-mapped questions, review it, then allocate it."};
}

export async function reviewQuestion(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only authorised teaching staff can review questions."};
  const parsed=z.object({
    questionId:databaseUuid,question:z.string().trim().min(5).max(5000),
    correctAnswer:z.string().trim().max(5000),
    alternatives:z.string().trim().max(5000),
    explanation:z.string().trim().min(5).max(5000),
    feedbackCorrect:z.string().trim().min(2).max(2000),
    feedbackIncorrect:z.string().trim().min(2).max(2000),
    hint:z.string().trim().max(2000),
    marks:z.coerce.number().positive().max(100),
    seconds:z.coerce.number().int().min(10).max(3600),
    pathway,status:z.enum(["draft","approved"]),
    blueprintCategory:z.string().trim().max(160),
    tags:z.string().trim().max(1000),options:z.string().trim().max(5000),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success||!["draft","approved"].includes(parsed.data.status)||!["Support","Core","Stretch","Mastery"].includes(parsed.data.pathway))return{message:"Check the question, feedback, pathway, marks, time, and approval status."};
  const blueprintValue=String(formData.get("blueprintId")??"");
  const blueprintId=databaseUuid.safeParse(blueprintValue).success?blueprintValue:null;
  const misconceptionIds=formData.getAll("misconceptionIds").map(String);
  if(!misconceptionIds.every(id=>databaseUuid.safeParse(id).success))return{message:"One of the misconception mappings is invalid."};
  const correct=parsed.data.correctAnswer?parseAnswer(parsed.data.correctAnswer):null;
  const alternatives=parsed.data.alternatives?splitLines(parsed.data.alternatives):null;
  const options=parsed.data.options?splitLines(parsed.data.options):null;
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_review_question",{
    question_uuid:parsed.data.questionId,question_value:parsed.data.question,
    correct_value:correct,alternatives_value:alternatives,
    explanation_value:parsed.data.explanation,
    feedback_correct_value:parsed.data.feedbackCorrect,
    feedback_incorrect_value:parsed.data.feedbackIncorrect,hint_value:parsed.data.hint,
    marks_value:parsed.data.marks,seconds_value:parsed.data.seconds,
    pathway_value:parsed.data.pathway,status_value:parsed.data.status,
    blueprint_uuid:blueprintId,blueprint_category_value:parsed.data.blueprintCategory,
    tags_value:splitLines(parsed.data.tags.replaceAll(",", "\n")),
    misconception_uuids:misconceptionIds,options_value:options,
  });
  if(error)return{message:"The question review could not be saved. Confirm that blueprint and misconception mappings match its skill."};
  revalidatePath("/teacher/content");
  return{ok:true,message:"Question review saved with curriculum, blueprint, and misconception evidence."};
}

export async function bulkApproveTargets(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only authorised teaching staff can approve targets."};
  const targetIds=formData.getAll("targetIds").map(String);
  const learnerId=databaseUuid.safeParse(formData.get("learnerId"));
  if(!learnerId.success||targetIds.length<1||targetIds.length>100||!targetIds.every(id=>databaseUuid.safeParse(id).success))return{message:"Select between 1 and 100 proposed targets."};
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("teacher_bulk_approve_targets",{target_uuids:targetIds});
  if(error)return{message:"The selected targets could not be approved."};
  revalidatePath(`/teacher/learners/${learnerId.data}`);
  return{ok:true,message:`Approved ${Number(data)} target${Number(data)===1?"":"s"}.`};
}

export async function recordBulkTeacherAction(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only authorised teaching staff can record actions."};
  const parsed=z.object({
    classId:databaseUuid,action:z.string().trim().min(3).max(120),
    reason:z.string().trim().min(3).max(1000),
    reviewOn:z.union([z.iso.date(),z.literal("")]),
    outcome:z.string().trim().max(1000),
  }).safeParse(Object.fromEntries(formData));
  const learnerIds=formData.getAll("learnerIds").map(String);
  if(!parsed.success||learnerIds.length<1||learnerIds.length>100||!learnerIds.every(id=>databaseUuid.safeParse(id).success))return{message:"Select between 1 and 100 learners and record an evidence-based action and reason."};
  const supabase=await createClient();
  const{data,error}=await supabase.rpc("teacher_record_bulk_action",{
    class_uuid:parsed.data.classId,learner_uuids:learnerIds,
    action_value:parsed.data.action,reason_value:parsed.data.reason,
    review_value:parsed.data.reviewOn||null,outcome_value:parsed.data.outcome,
  });
  if(error)return{message:"The bulk teacher action could not be recorded."};
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  return{ok:true,message:`Teacher action recorded for ${Number(data)} learner${Number(data)===1?"":"s"}.`};
}

export async function saveCalendarEvent(_:ActionState,formData:FormData):Promise<ActionState>{
  const actor=await getSessionProfile();
  if(!actor||!canCreateClass(actor.role))return{message:"Only authorised teaching staff can manage the academic calendar."};
  const parsed=z.object({
    academicYearId:databaseUuid,
    academicPeriodId:z.union([databaseUuid,z.literal("")]),
    title:z.string().trim().min(3).max(160),
    kind:z.enum(["holiday","teaching_week","progress_point_week","review_week","examination_reminder"]),
    startsOn:z.iso.date(),endsOn:z.iso.date(),
    note:z.string().trim().max(1000),
    eventId:z.union([databaseUuid,z.literal("")]),
  }).safeParse(Object.fromEntries(formData));
  if(!parsed.success||parsed.data.endsOn<parsed.data.startsOn)return{message:"Choose an academic year, event type, title, and valid dates."};
  const supabase=await createClient();
  const{error}=await supabase.rpc("teacher_save_calendar_event",{
    event_uuid:parsed.data.eventId||null,
    academic_year_uuid:parsed.data.academicYearId,
    academic_period_uuid:parsed.data.academicPeriodId||null,
    title_value:parsed.data.title,kind_value:parsed.data.kind,
    starts_value:parsed.data.startsOn,ends_value:parsed.data.endsOn,
    metadata_value:parsed.data.note?{note:parsed.data.note}:{},
    archive_value:formData.get("archive")==="on",
  });
  if(error)return{message:"The calendar event could not be saved. Confirm that the period belongs to the selected year."};
  revalidatePath("/teacher/content");
  revalidatePath("/dashboard");
  return{ok:true,message:formData.get("archive")==="on"?"Calendar event archived.":"Calendar event saved."};
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
}

function parseAnswer(value: string): unknown {
  try { return JSON.parse(value); } catch { return value; }
}

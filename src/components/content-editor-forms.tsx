"use client";

import { useActionState } from "react";
import {
  allocateActivity, createActivity, createAssessmentBlueprint, createQuestion,
  reviewQuestion, saveLesson, setContentStatus, setGamification, type ActionState,
} from "@/app/actions/learning";

type Option = { id: string; title: string };
type LessonDefaults = {
  id: string; topicId: string; weekNumber: number; title: string; learn: string; remember: string;
  workedExample: string; reflection: string; language: string; objectives: string[]; minutes: number; status: string;
};

export function LessonEditorForm({ topics, lesson }: { topics: Option[]; lesson?: LessonDefaults }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveLesson, {});
  return <form action={action} className="grid gap-4">
    <input type="hidden" name="lessonId" value={lesson?.id ?? ""}/>
    <div className="grid gap-4 md:grid-cols-[1fr_8rem]"><Field label="Topic"><select className="input" name="topicId" defaultValue={lesson?.topicId} required>{topics.map(topic => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></Field><Field label="Week"><input className="input" name="weekNumber" type="number" min="1" defaultValue={lesson?.weekNumber ?? 1} required/></Field></div>
    <Field label="Lesson title"><input className="input" name="title" defaultValue={lesson?.title} required/></Field>
    <Field label="Remember statement"><textarea className="input min-h-20" name="remember" defaultValue={lesson?.remember}/></Field>
    <Field label="Core learning explanation"><textarea className="input min-h-32" name="learn" defaultValue={lesson?.learn} required/></Field>
    <Field label="Worked-example summary"><textarea className="input min-h-24" name="workedExample" defaultValue={lesson?.workedExample} required/></Field>
    <Field label="Reflection prompt"><textarea className="input min-h-20" name="reflection" defaultValue={lesson?.reflection}/></Field>
    <Field label="Objectives (one per line)"><textarea className="input min-h-28" name="objectives" defaultValue={lesson?.objectives.join("\n")}/></Field>
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Language"><input className="input" name="language" defaultValue={lesson?.language ?? "Python"}/></Field><Field label="Minutes"><input className="input" name="minutes" type="number" min="5" defaultValue={lesson?.minutes ?? 45} required/></Field><Field label="Visibility"><select className="input" name="status" defaultValue={lesson?.status ?? "draft"}><option value="draft">Draft</option><option value="approved">Approved</option><option value="archived">Archived</option></select></Field></div>
    <Submit pending={pending} label={lesson ? "Save lesson changes" : "Create lesson"}/><Feedback state={state}/>
  </form>;
}

export function QuestionEditorForm({ activities, skills }: { activities: Option[]; skills: Option[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createQuestion, {});
  return <form action={action} className="grid gap-4">
    <div className="grid gap-4 md:grid-cols-2"><Field label="Activity"><select className="input" name="activityId" required>{activities.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></Field><Field label="Skill"><select className="input" name="skillId" required>{skills.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></Field></div>
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Question type"><select className="input" name="kind" defaultValue="short_text">{["single_choice","multiple_response","true_false","matching","ordering","fill_blank","short_text","numeric","code_output","code_completion","identify_error","correct_code","pseudocode_ordering","sql_completion","html_css_completion","javascript_completion","scenario","scenario_decision","confidence","reflection","extended_response"].map(kind => <option key={kind} value={kind}>{kind.replaceAll("_"," ")}</option>)}</select></Field><Field label="Pathway"><select className="input" name="pathway" defaultValue="Core">{["Support","Core","Stretch","Mastery"].map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Status"><select className="input" name="status" defaultValue="draft"><option value="draft">Draft for approval</option><option value="approved">Approved</option></select></Field></div>
    <Field label="Question text"><textarea className="input min-h-28 font-mono" name="question" required/></Field>
    <Field label="Correct answer"><textarea className="input min-h-20 font-mono" name="correctAnswer" placeholder={'Text, number, true, or JSON such as ["A","B"]'} required/></Field>
    <div className="grid gap-4 md:grid-cols-2"><Field label="Acceptable alternatives (one per line)"><textarea className="input min-h-24" name="alternatives"/></Field><Field label="Answer options (one per line)"><textarea className="input min-h-24" name="options"/></Field></div>
    <Field label="Explanation"><textarea className="input min-h-24" name="explanation" required/></Field>
    <div className="grid gap-4 md:grid-cols-2"><Field label="Correct feedback"><textarea className="input min-h-20" name="feedbackCorrect" defaultValue="Correct and well reasoned." required/></Field><Field label="Incorrect feedback"><textarea className="input min-h-20" name="feedbackIncorrect" defaultValue="Review the explanation and try this skill again." required/></Field></div>
    <Field label="Hint (leave empty for independent checks)"><textarea className="input min-h-20" name="hint"/></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Marks"><input className="input" name="marks" type="number" min="1" defaultValue="1" required/></Field><Field label="Estimated seconds"><input className="input" name="seconds" type="number" min="10" defaultValue="60" required/></Field></div>
    <Submit pending={pending} label="Add question to bank"/><Feedback state={state}/>
  </form>;
}

export function AssessmentBlueprintForm({versions,units}:{versions:Option[];units:Option[]}){
  const[state,action,pending]=useActionState<ActionState,FormData>(createAssessmentBlueprint,{});
  return <form action={action} className="grid gap-4">
    <div className="grid gap-4 md:grid-cols-2"><Field label="Curriculum version"><select className="input" name="curriculumVersionId" required>{versions.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></Field><Field label="Unit / Content Area"><select className="input" name="unitId"><option value="">Whole course</option>{units.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></Field></div>
    <div className="grid gap-4 md:grid-cols-2"><Field label="Assessment purpose"><select className="input" name="scope" defaultValue="progress_point"><option value="course_starting_point">Course starting point</option><option value="unit_starting_point">Unit starting point</option><option value="progress_point">Progress-point check</option><option value="retention_check">Delayed retention check</option></select></Field><Field label="Status"><select className="input" name="status" defaultValue="draft"><option value="draft">Draft for review</option><option value="approved">Approved</option></select></Field></div>
    <Field label="Blueprint title"><input className="input" name="title" placeholder="Unit 4 progress point, week 4" required/></Field>
    <Submit pending={pending} label="Create assessment blueprint"/><Feedback state={state}/>
  </form>;
}

export function QuestionReviewForm({
  question,blueprints,misconceptions,
}:{
  question:{
    id:string;question_text:string;pathway:string|null;status:string;
    explanation:string;feedback_correct:string|null;feedback_incorrect:string|null;
    hint:string|null;marks:number|string;estimated_seconds:number|null;
    blueprint_id:string|null;blueprint_category:string|null;tags:string[];
    optionText:string[];
    misconceptionIds:string[];
  };
  blueprints:Option[];
  misconceptions:Option[];
}){
  const[state,action,pending]=useActionState<ActionState,FormData>(reviewQuestion,{});
  return <form action={action} className="mt-4 grid gap-3">
    <input type="hidden" name="questionId" value={question.id}/>
    <Field label="Question text"><textarea className="input min-h-24 font-mono" name="question" defaultValue={question.question_text} required/></Field>
    <Field label="Replacement correct answer (leave blank to preserve the stored answer)"><textarea className="input min-h-16 font-mono" name="correctAnswer"/></Field>
    <Field label="Replacement acceptable alternatives (leave blank to preserve)"><textarea className="input min-h-16" name="alternatives"/></Field>
    <Field label="Explanation"><textarea className="input min-h-20" name="explanation" defaultValue={question.explanation} required/></Field>
    <div className="grid gap-3 md:grid-cols-2"><Field label="Correct feedback"><textarea className="input min-h-16" name="feedbackCorrect" defaultValue={question.feedback_correct??"Correct and well reasoned."} required/></Field><Field label="Incorrect feedback"><textarea className="input min-h-16" name="feedbackIncorrect" defaultValue={question.feedback_incorrect??"Review the explanation and try again."} required/></Field></div>
    <Field label="Hint"><textarea className="input min-h-16" name="hint" defaultValue={question.hint??""}/></Field>
    <div className="grid gap-3 sm:grid-cols-4"><Field label="Pathway"><select className="input" name="pathway" defaultValue={question.pathway??"Core"}>{["Support","Core","Stretch","Mastery"].map(value=><option key={value}>{value}</option>)}</select></Field><Field label="Marks"><input className="input" name="marks" type="number" min="0.5" step="0.5" defaultValue={question.marks} required/></Field><Field label="Seconds"><input className="input" name="seconds" type="number" min="10" defaultValue={question.estimated_seconds??60} required/></Field><Field label="Status"><select className="input" name="status" defaultValue={question.status}><option value="draft">Draft</option><option value="approved">Approved</option></select></Field></div>
    <div className="grid gap-3 md:grid-cols-2"><Field label="Assessment blueprint"><select className="input" name="blueprintId" defaultValue={question.blueprint_id??""}><option value="">Ordinary practice question</option>{blueprints.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></Field><Field label="Blueprint category"><input className="input" name="blueprintCategory" defaultValue={question.blueprint_category??""} placeholder="e.g. variables-and-data-types"/></Field></div>
    <Field label="Misconception tags"><select className="input min-h-28" name="misconceptionIds" multiple defaultValue={question.misconceptionIds}>{misconceptions.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></Field>
    <div className="grid gap-3 md:grid-cols-2"><Field label="Search tags (comma or line separated)"><textarea className="input min-h-16" name="tags" defaultValue={question.tags.join("\n")}/></Field><Field label="Replacement answer options (leave blank to preserve)"><textarea className="input min-h-16" name="options" placeholder={question.optionText.join("\n")}/></Field></div>
    <Submit pending={pending} label="Save reviewed question"/><Feedback state={state}/>
  </form>;
}

export function ActivityEditorForm({lessons,blueprints}:{lessons:Option[];blueprints:Option[]}){
  const[state,action,pending]=useActionState<ActionState,FormData>(createActivity,{});
  return <form action={action} className="grid gap-4">
    <Field label="Lesson"><select className="input" name="lessonId" required>{lessons.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></Field>
    <Field label="Activity title"><input className="input" name="title" placeholder="Python variables Core practice" required/></Field>
    <div className="grid gap-4 md:grid-cols-3"><Field label="Activity type"><select className="input" name="kind" defaultValue="in_class_practice"><option value="in_class_learning">Classroom learning</option><option value="in_class_practice">Classwork</option><option value="homework">Homework</option><option value="revision">Revision</option><option value="holiday_work">Holiday practice</option><option value="skills_practice">Practical skills</option><option value="review_check">Review / progress check</option></select></Field><Field label="Learning stage"><select className="input" name="stage" defaultValue="core_practice">{["learn","worked_example","guided_practice","core_practice","challenge_practice","mastery_check","retrieval_review"].map(value=><option value={value} key={value}>{value.replaceAll("_"," ")}</option>)}</select></Field><Field label="Pathway"><select className="input" name="pathway" defaultValue="Core">{["Support","Core","Stretch","Mastery"].map(value=><option key={value}>{value}</option>)}</select></Field></div>
    <div className="grid gap-4 md:grid-cols-3"><Field label="Expected minutes"><input className="input" name="estimatedMinutes" type="number" min="1" max="240" defaultValue="15" required/></Field><Field label="Maximum attempts"><input className="input" name="maxAttempts" type="number" min="1" max="20" defaultValue="3" required/></Field><Field label="Homework session"><input className="input" name="homeSession" type="number" min="1" max="20" placeholder="Optional"/></Field></div>
    <Field label="Instructions"><textarea className="input min-h-20" name="instructions" placeholder="What the learner should complete and what evidence is expected."/></Field>
    <div className="grid gap-4 md:grid-cols-2"><Field label="Assessment purpose"><select className="input" name="assessmentKind" defaultValue=""><option value="">Ordinary formative activity</option><option value="course_starting_point">Course starting point</option><option value="unit_starting_point">Unit starting point</option><option value="progress_point">Progress-point check</option><option value="retention_check">Retention check</option></select></Field><Field label="Approved blueprint"><select className="input" name="blueprintId"><option value="">Not an assessment activity</option>{blueprints.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></Field></div>
    <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="required" defaultChecked/>Required</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="automaticMarking" defaultChecked/>Automatic marking where appropriate</label><Field label="Visibility"><select className="input" name="status" defaultValue="draft"><option value="draft">Draft</option><option value="approved">Approved</option></select></Field></div>
    <Submit pending={pending} label="Create formative activity"/><Feedback state={state}/>
  </form>;
}

export function AllocationForm({ activities, classes }: { activities: Option[]; classes: Option[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(allocateActivity, {});
  const tomorrow = localDateTime(1);
  const nextWeek = localDateTime(8);
  return <form action={action} className="grid gap-4">
    <div className="grid gap-4 md:grid-cols-2"><Field label="Activity"><select className="input" name="activityId">{activities.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></Field><Field label="Class"><select className="input" name="classId">{classes.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></Field></div>
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Pathway"><select className="input" name="pathway" defaultValue="Core">{["Support","Core","Stretch","Mastery"].map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Release"><input className="input" name="releaseAt" type="datetime-local" defaultValue={tomorrow} required/></Field><Field label="Deadline"><input className="input" name="deadlineAt" type="datetime-local" defaultValue={nextWeek} required/></Field></div>
    <label className="flex items-center gap-3 text-sm font-semibold"><input className="size-5" type="checkbox" name="required" defaultChecked/>Required learning</label>
    <Submit pending={pending} label="Allocate activity"/><Feedback state={state}/>
  </form>;
}

export function GamificationForm({ classes }: { classes: Option[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setGamification, {});
  return <form action={action} className="grid gap-4">
    <Field label="Class"><select className="input" name="classId">{classes.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></Field>
    <div className="flex flex-wrap gap-5">{["badges","coins","streaks"].map(item => <label className="flex items-center gap-2 font-semibold capitalize" key={item}><input className="size-5" type="checkbox" name={item} defaultChecked/>{item}</label>)}</div>
    <Submit pending={pending} label="Save class settings"/><Feedback state={state}/>
  </form>;
}

export function ContentStatusForm({ entity, entityId, status }: { entity: "lesson" | "activity" | "question"; entityId: string; status: "draft" | "approved" | "archived" }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setContentStatus, {});
  return <form action={action}>
    <input type="hidden" name="entity" value={entity}/><input type="hidden" name="entityId" value={entityId}/><input type="hidden" name="status" value={status}/>
    <button className="link text-sm" disabled={pending}>{pending ? "Saving…" : status === "approved" ? "Approve" : status === "archived" ? "Archive" : "Return to draft"}</button>
    <Feedback state={state}/>
  </form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-semibold">{label}{children}</label>; }
function Submit({ pending, label }: { pending: boolean; label: string }) { return <button className="button justify-self-start" disabled={pending}>{pending ? "Saving…" : label}</button>; }
function Feedback({ state }: { state: ActionState }) { return state.message ? <p className={`mt-2 text-sm ${state.ok ? "text-teal-800" : "text-red-700"}`} role="status">{state.message}</p> : null; }
function localDateTime(days: number) { const date = new Date(Date.now() + days * 86400000); date.setMinutes(0, 0, 0); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

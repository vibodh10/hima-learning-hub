"use client";
import { useActionState, useState } from "react";
import {
  addClassTeacher, allocateAdaptiveHomework, archiveClass, archiveEnrolment,
  configureClass, createClass, duplicateClass, importExistingStudents,
  moveStudent, recordBulkTeacherAction, saveWeeklyPlan, setPathwayThresholds,
  startGroupLearningJourney, type ActionState,
} from "@/app/actions/learning";
import { ISO_WEEKDAYS, normaliseWeeklyLearningDays } from "@/lib/weekly-schedule";

export function CreateClassForm({ courses, years }: { courses: { id: string; title: string }[]; years: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createClass, {});
  return <details className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-5" open={!courses.length || !years.length}>
    <summary className="cursor-pointer font-bold text-teal-900">Create a student group</summary>
    <p className="mt-3 text-sm leading-6 text-slate-700">Choose the programme now. On the next screen, select the units you teach and invite your students.</p>
    <form action={action} className="mt-5 grid gap-4 md:grid-cols-2">
      <Field label="Group name" name="className" placeholder="BTEC IT · Group A" />
      <label className="grid gap-2 text-sm font-semibold">Programme<select className="input" name="courseId" required>{courses.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold">Academic year<select className="input" name="academicYearId" required>{years.map(y=><option value={y.id} key={y.id}>{y.name}</option>)}</select></label>
      <button className="button self-end" disabled={pending || !courses.length || !years.length}>{pending ? "Creating…" : "Create group and choose units →"}</button>
      {state.message && <p role="status" className={`md:col-span-2 text-sm ${state.ok ? "text-teal-800" : "text-red-700"}`}>{state.message}</p>}
    </form>
  </details>;
}
function Field({label,name,placeholder,defaultValue}:{label:string;name:string;placeholder:string;defaultValue?:string}) { return <label className="grid gap-2 text-sm font-semibold">{label}<input className="input" name={name} placeholder={placeholder} defaultValue={defaultValue} required /></label>; }

type CurriculumUnit = { id: string; course_id: string; code: string; title: string; kind: string; initial_teaching: boolean };
type Period = { id: string; name: string; kind: string; academic_years: { name: string } | { name: string }[] | null };

export function ClassSettingsForm({
  classData, courses, units, periods, selectedUnitIds,
}: {
  classData: {
    id: string; name: string; course_id: string; academic_period_id: string | null;
    active_unit_id: string | null; starts_on: string | null; ends_on: string | null;
    weekly_learning_day: number | null; weekly_learning_days: number[] | null; published: boolean;
  };
  courses: { id: string; title: string }[];
  units: CurriculumUnit[];
  periods: Period[];
  selectedUnitIds: string[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(configureClass, {});
  const [courseId, setCourseId] = useState(classData.course_id);
  const visibleUnits = units.filter(unit => unit.course_id === courseId);
  const selectedLearningDays = normaliseWeeklyLearningDays(
    classData.weekly_learning_days,
    classData.weekly_learning_day,
  );
  return <details className="card mt-6 border-teal-200" id="unit-settings" open={!selectedUnitIds.length}>
    <summary className="cursor-pointer text-xl font-bold">1. Choose the units you teach</summary>
    <p className="mt-2 text-sm text-slate-600">Select only the units this student group should see. You can return here whenever your teaching allocation changes.</p>
    <form action={action} className="mt-5 grid gap-5">
      <input type="hidden" name="classId" value={classData.id}/>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Class name" name="className" placeholder="Group 1" defaultValue={classData.name}/>
        <label className="grid gap-2 text-sm font-semibold">Programme
          <select className="input" name="courseId" value={courseId} onChange={event => setCourseId(event.target.value)} required>
            {courses.map(course => <option value={course.id} key={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Term or semester
          <select className="input" name="academicPeriodId" defaultValue={classData.academic_period_id ?? ""} required>
            <option value="" disabled>Select a period</option>
            {periods.map(period => <option value={period.id} key={period.id}>{relatedYear(period.academic_years)} · {period.name} ({period.kind})</option>)}
          </select>
        </label>
        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold">Usual weekly learning days</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ISO_WEEKDAYS.map(day => <label className="flex items-center gap-2 text-sm" key={day.value}>
              <input
                type="checkbox"
                name="weeklyLearningDays"
                value={day.value}
                defaultChecked={selectedLearningDays.includes(day.value)}
              />
              {day.label}
            </label>)}
          </div>
          <p className="mt-3 text-xs text-slate-500">Select every regular teaching day. The earliest selected day anchors the once-per-week learning journey.</p>
        </fieldset>
      </div>
      <fieldset>
        <legend className="text-sm font-bold">Units taught to this group</legend>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {visibleUnits.map(unit => <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm" key={unit.id}>
            <input className="mt-1" type="checkbox" name="unitIds" value={unit.id} defaultChecked={selectedUnitIds.includes(unit.id)}/>
            <span><strong>{unit.code.match(/^\d+$/) ? `Unit ${unit.code}: ` : ""}{unit.title}</strong><span className="block text-slate-500">{unit.kind.replaceAll("_"," ")}{unit.initial_teaching ? " · suggested initial unit" : ""}</span></span>
          </label>)}
        </div>
      </fieldset>
      <label className="grid gap-2 text-sm font-semibold">Unit students should start with
        <select className="input" name="activeUnitId" defaultValue={classData.active_unit_id ?? ""} required>
          <option value="" disabled>Select current focus</option>
          {visibleUnits.map(unit => <option value={unit.id} key={unit.id}>{unit.code.match(/^\d+$/) ? `${unit.code} · ` : ""}{unit.title}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" name="published" defaultChecked={classData.published}/>
        Make these units visible to enrolled students
      </label>
      <button className="button justify-self-start" disabled={pending}>{pending ? "Saving…" : "Save units and continue"}</button>
      {state.message && <p role="status" className={`text-sm ${state.ok ? "text-teal-800" : "text-red-700"}`}>{state.message}</p>}
    </form>
  </details>;
}

export function StartGroupJourneyForm({
  classId,
  templates,
}: {
  classId: string;
  templates: { id: string; title: string; unitCode: string; unitTitle: string; totalTeachingWeeks: number }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(startGroupLearningJourney, {});
  return <form action={action} className="card mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
    <input type="hidden" name="classId" value={classId}/>
    <div className="md:col-span-2">
      <p className="eyebrow">Journey recovery</p>
      <h2 className="mt-2 text-2xl font-bold">Restore journey tracking</h2>
      <p className="mt-2 text-sm text-slate-600">This class already has students but no active journey. Choose an approved unit journey to restore Teaching Week tracking; configured holidays and closures remain excluded.</p>
    </div>
    <label className="grid gap-2 text-sm font-semibold">Unit journey
      <select className="input" name="templateId" required defaultValue="">
        <option value="" disabled>Choose an approved journey</option>
        {templates.map(template => <option value={template.id} key={template.id}>
          Unit {template.unitCode}: {template.unitTitle} · {template.totalTeachingWeeks} teaching weeks
        </option>)}
      </select>
    </label>
    <button className="button self-end" disabled={pending || !templates.length}>
      {pending ? "Restoring…" : "Restore journey tracking"}
    </button>
    {!templates.length && <p className="text-sm text-amber-900 md:col-span-2">No approved shared journey is available for this class’s active units.</p>}
    {state.message && <p role="status" className={`text-sm md:col-span-2 ${state.ok ? "text-teal-800" : "text-red-700"}`}>{state.message}</p>}
  </form>;
}

function relatedYear(value: Period["academic_years"]) {
  return (Array.isArray(value) ? value[0] : value)?.name ?? "Academic year";
}

export function ClassLifecycleForms({classId}:{classId:string}){
  const[duplicateState,duplicateAction,duplicating]=useActionState<ActionState,FormData>(duplicateClass,{});
  const[importState,importAction,importing]=useActionState<ActionState,FormData>(importExistingStudents,{});
  return <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <details className="card"><summary className="cursor-pointer text-lg font-bold">Duplicate class structure</summary><form action={duplicateAction} className="mt-4 grid gap-3"><input type="hidden" name="sourceClassId" value={classId}/><Field label="New class name" name="newName" placeholder="Group 6"/><p className="text-xs text-slate-500">Student access stays closed until the new group is published and a teacher opens its temporary registration link.</p><button className="button-secondary justify-self-start" disabled={duplicating}>{duplicating?"Duplicating…":"Duplicate structure"}</button>{duplicateState.message&&<p className={`text-sm ${duplicateState.ok?"text-teal-800":"text-red-700"}`}>{duplicateState.message}</p>}</form></details>
    <details className="card"><summary className="cursor-pointer text-lg font-bold">Import existing learners</summary><form action={importAction} className="mt-4 grid gap-3"><input type="hidden" name="classId" value={classId}/><label className="grid gap-1 text-sm font-semibold">Source filename<input className="input" name="filename" defaultValue="learner-import.csv"/></label><label className="grid gap-1 text-sm font-semibold">Learner account emails<textarea className="input min-h-28" name="emails" placeholder={"student1@example.com\nstudent2@example.com"} required/></label><p className="text-xs text-slate-500">Paste the email column from a CSV. Accounts must already exist in this organisation; unmatched rows are retained in the import evidence.</p><button className="button-secondary justify-self-start" disabled={importing}>{importing?"Importing…":"Import learners"}</button>{importState.message&&<p className={`text-sm ${importState.ok?"text-teal-800":"text-red-700"}`}>{importState.message}</p>}</form></details>
  </div>;
}

export function ExtendedClassLifecycleForms({
  classId,teachers,otherClasses,learners,
}:{
  classId:string;
  teachers:{id:string;display_name:string}[];
  otherClasses:{id:string;name:string}[];
  learners:{id:string;displayName:string}[];
}){
  const[teacherState,teacherAction,addingTeacher]=useActionState<ActionState,FormData>(addClassTeacher,{});
  const[moveState,moveAction,moving]=useActionState<ActionState,FormData>(moveStudent,{});
  const[removeState,removeAction,removing]=useActionState<ActionState,FormData>(archiveEnrolment,{});
  const[archiveState,archiveAction,archiving]=useActionState<ActionState,FormData>(archiveClass,{});
  return <div className="mt-6 grid gap-6 lg:grid-cols-2">
    <details className="card"><summary className="cursor-pointer text-lg font-bold">Add a co-teacher</summary><form action={teacherAction} className="mt-4 grid gap-3"><input type="hidden" name="classId" value={classId}/><label className="grid gap-1 text-sm font-semibold">Teacher<select className="input" name="teacherId" required><option value="">Choose a teacher</option>{teachers.map(teacher=><option value={teacher.id} key={teacher.id}>{teacher.display_name}</option>)}</select></label><button className="button-secondary justify-self-start" disabled={addingTeacher||!teachers.length}>{addingTeacher?"Adding...":"Add co-teacher"}</button>{teacherState.message&&<p className={`text-sm ${teacherState.ok?"text-teal-800":"text-red-700"}`}>{teacherState.message}</p>}</form></details>
    <details className="card"><summary className="cursor-pointer text-lg font-bold">Move a learner</summary><form action={moveAction} className="mt-4 grid gap-3"><input type="hidden" name="fromClassId" value={classId}/><label className="grid gap-1 text-sm font-semibold">Learner<select className="input" name="learnerId" required><option value="">Choose a learner</option>{learners.map(learner=><option value={learner.id} key={learner.id}>{learner.displayName}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Destination class<select className="input" name="toClassId" required><option value="">Choose a class</option>{otherClasses.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Reason<textarea className="input min-h-20" name="reason" required placeholder="Timetable or curriculum change"/></label><button className="button-secondary justify-self-start" disabled={moving||!learners.length||!otherClasses.length}>{moving?"Moving...":"Move learner and preserve results"}</button>{moveState.message&&<p className={`text-sm ${moveState.ok?"text-teal-800":"text-red-700"}`}>{moveState.message}</p>}</form></details>
    <details className="card"><summary className="cursor-pointer text-lg font-bold">Archive an enrolment</summary><form action={removeAction} className="mt-4 grid gap-3"><input type="hidden" name="classId" value={classId}/><label className="grid gap-1 text-sm font-semibold">Learner<select className="input" name="learnerId" required><option value="">Choose a learner</option>{learners.map(learner=><option value={learner.id} key={learner.id}>{learner.displayName}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Reason<textarea className="input min-h-20" name="reason" required placeholder="Learner has left this class"/></label><button className="button-secondary justify-self-start" disabled={removing||!learners.length}>{removing?"Archiving...":"Archive enrolment"}</button><p className="text-xs text-slate-500">Attempts, targets, snapshots, coins and reports remain preserved.</p>{removeState.message&&<p className={`text-sm ${removeState.ok?"text-teal-800":"text-red-700"}`}>{removeState.message}</p>}</form></details>
    <details className="card border-red-200"><summary className="cursor-pointer text-lg font-bold text-red-800">Archive this class</summary><form action={archiveAction} className="mt-4 grid gap-3"><input type="hidden" name="classId" value={classId}/><p className="text-sm text-slate-600">This hides the class and closes active enrolments while retaining all historical learner evidence.</p><label className="grid gap-1 text-sm font-semibold">Type ARCHIVE to confirm<input className="input" name="confirmation" autoComplete="off" required/></label><button className="button-secondary justify-self-start" disabled={archiving}>{archiving?"Archiving...":"Archive class"}</button>{archiveState.message&&<p className={`text-sm ${archiveState.ok?"text-teal-800":"text-red-700"}`}>{archiveState.message}</p>}</form></details>
  </div>;
}

export function BulkTeacherActionForm({classId,learners}:{classId:string;learners:{id:string;displayName:string}[]}){
  const[state,action,pending]=useActionState<ActionState,FormData>(recordBulkTeacherAction,{});
  const actions=["result reviewed","additional practice allocated","pathway changed","explanation provided","support arranged","target created","target extended","deadline extended","progress discussed","topic fast-tracked","student returned to earlier content","no action required","custom action"];
  return <form action={action} className="card mt-6 grid gap-4"><input type="hidden" name="classId" value={classId}/><div><p className="eyebrow">Quick evidence</p><h2 className="mt-2 text-2xl font-bold">Bulk teacher action</h2><p className="mt-2 text-sm text-slate-600">Use when the same evidence-based response applies to several learners.</p></div><fieldset><legend className="text-sm font-bold">Learners</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{learners.map(learner=><label className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm" key={learner.id}><input type="checkbox" name="learnerIds" value={learner.id}/>{learner.displayName}</label>)}</div></fieldset><div className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Action<select className="input" name="action">{actions.map(value=><option key={value}>{value}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Review date<input className="input" name="reviewOn" type="date"/></label></div><label className="grid gap-1 text-sm font-semibold">Evidence-based reason<textarea className="input min-h-20" name="reason" required/></label><label className="grid gap-1 text-sm font-semibold">Outcome, if already known<textarea className="input min-h-16" name="outcome"/></label><button className="button-secondary justify-self-start" disabled={pending||!learners.length}>{pending?"Recording...":"Record action for selected learners"}</button>{state.message&&<p className={`text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}</form>;
}

export function AdaptiveHomeworkForm({classId,topics}:{classId:string;topics:{id:string;title:string;unitTitle:string}[]}){
  const[state,action,pending]=useActionState<ActionState,FormData>(allocateAdaptiveHomework,{});
  return <form action={action} className="card mt-6 grid gap-4">
    <input type="hidden" name="classId" value={classId}/><div><p className="eyebrow">Adaptive homework</p><h2 className="mt-2 text-2xl font-bold">Allocate learner-specific practice</h2><p className="mt-2 text-sm text-slate-600">Auto uses each learner’s weakest current skill pathway; the class can receive different approved activities for the same topic.</p></div>
    <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Topic<select className="input" name="topicId">{topics.map(topic=><option value={topic.id} key={topic.id}>{topic.unitTitle} · {topic.title}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Pathway allocation<select className="input" name="pathwayMode" defaultValue="Auto">{["Auto","Support","Core","Stretch","Mastery"].map(value=><option key={value}>{value}</option>)}</select></label><label className="grid gap-1 text-sm font-semibold">Release<input className="input" type="datetime-local" name="releaseAt" required/></label><label className="grid gap-1 text-sm font-semibold">Deadline<input className="input" type="datetime-local" name="deadlineAt" required/></label><label className="grid gap-1 text-sm font-semibold">Expected minutes<input className="input" type="number" name="expectedMinutes" min="5" max="120" defaultValue="15" required/></label><label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" name="required" defaultChecked/>Required homework</label></div>
    <button className="button justify-self-start" disabled={pending||!topics.length}>{pending?"Allocating…":"Allocate adaptive homework"}</button>{state.message&&<p className={`text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}
  </form>;
}

export function WeeklyPlanForm({classId}:{classId:string}){
  const[state,action,pending]=useActionState<ActionState,FormData>(saveWeeklyPlan,{});
  return <form action={action} className="card mt-6 grid gap-4"><input type="hidden" name="classId" value={classId}/><div><p className="eyebrow">Weekly learning model</p><h2 className="mt-2 text-2xl font-bold">Classroom and homework expectations</h2></div><div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Week beginning<input className="input" type="date" name="weekStart" required/></label><label className="grid gap-1 text-sm font-semibold">Plan title<input className="input" name="title" placeholder="Python foundations week" required/></label><label className="grid gap-1 text-sm font-semibold">Homework practice sessions<input className="input" type="number" min="0" max="7" name="homeSessions" defaultValue="3" required/></label><label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" name="retrievalRequired" defaultChecked/>End-of-week retrieval review</label><label className="grid gap-1 text-sm font-semibold">Release<input className="input" type="datetime-local" name="releaseAt" required/></label><label className="grid gap-1 text-sm font-semibold">Deadline<input className="input" type="datetime-local" name="deadlineAt" required/></label></div><button className="button-secondary justify-self-start" disabled={pending}>{pending?"Saving…":"Save weekly expectations"}</button>{state.message&&<p className={`text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}</form>;
}

export function PathwayThresholdForm({classId}:{classId:string}){
  const[state,action,pending]=useActionState<ActionState,FormData>(setPathwayThresholds,{});
  return <form action={action} className="card mt-6 grid gap-4"><input type="hidden" name="classId" value={classId}/><div><p className="eyebrow">Adaptive evidence settings</p><h2 className="mt-2 text-2xl font-bold">Pathway thresholds and weights</h2><p className="mt-2 text-sm text-slate-600">Percentages are the starting point; hints, repeated errors, confidence and retention remain visible evidence.</p></div><div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-sm font-semibold">Support maximum<input className="input" type="number" step="0.01" name="supportMax" defaultValue="49.99"/></label><label className="grid gap-1 text-sm font-semibold">Core maximum<input className="input" type="number" step="0.01" name="coreMax" defaultValue="69.99"/></label><label className="grid gap-1 text-sm font-semibold">Stretch maximum<input className="input" type="number" step="0.01" name="stretchMax" defaultValue="84.99"/></label></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-1 text-sm font-semibold">Hint weight<input className="input" type="number" step="0.1" name="hintsWeight" defaultValue="4"/></label><label className="grid gap-1 text-sm font-semibold">Repeated-error weight<input className="input" type="number" step="0.1" name="repeatedErrorWeight" defaultValue="2"/></label><label className="grid gap-1 text-sm font-semibold">Confidence weight<input className="input" type="number" step="0.1" name="confidenceWeight" defaultValue="2"/></label><label className="grid gap-1 text-sm font-semibold">Retention weight<input className="input" type="number" step="0.1" name="retentionWeight" defaultValue="15"/></label></div><button className="button-secondary justify-self-start" disabled={pending}>{pending?"Saving…":"Save pathway settings"}</button>{state.message&&<p className={`text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}</form>;
}

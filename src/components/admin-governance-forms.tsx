"use client";

import { useActionState } from "react";
import {
  createAcademicYear, createCurriculumVersion, manageProfile,
  executeLearnerDataDeletion, requestLearnerDataDeletion,
  setAcademicYearStatus, setCourseStatus, setCurriculumVersionStatus,
  type ActionState,
} from "@/app/actions/learning";

export function ProfileManagementForm({profile}:{profile:{id:string;display_name:string;role:string;archived_at:string|null}}){
  const[state,action,pending]=useActionState<ActionState,FormData>(manageProfile,{});
  return <article className="rounded-xl border border-slate-200 p-4">
    <form action={action}>
      <input type="hidden" name="profileId" value={profile.id}/>
      <strong>{profile.display_name}</strong>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-semibold">Role<select className="input" name="role" defaultValue={profile.role}>{["student","teacher","administrator"].map(role=><option value={role} key={role}>{role}</option>)}</select></label>
        <label className="flex items-center gap-2 pb-3 text-sm font-semibold"><input type="checkbox" name="archived" defaultChecked={Boolean(profile.archived_at)}/>Archived</label>
        <button className="button-secondary" disabled={pending}>{pending?"Saving...":"Save user"}</button>
      </div>
      {state.message&&<p className={`mt-2 text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}
    </form>
    {profile.role==="student"&&<><div className="mt-3 text-sm"><a className="link" href={`/teacher/learners/${profile.id}`}>Open learner record to choose a class and export evidence</a></div><LearnerDeletionRequestForm learnerId={profile.id}/></>}
  </article>;
}

export function AcademicYearCreateForm(){
  const[state,action,pending]=useActionState<ActionState,FormData>(createAcademicYear,{});
  return <form action={action} className="mt-5 grid gap-3 sm:grid-cols-2">
    <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Academic year name<input className="input" name="name" placeholder="2027/28" required/></label>
    <label className="grid gap-1 text-sm font-semibold">Start date<input className="input" name="startsOn" type="date" required/></label>
    <label className="grid gap-1 text-sm font-semibold">End date<input className="input" name="endsOn" type="date" required/></label>
    <button className="button-secondary justify-self-start sm:col-span-2" disabled={pending}>{pending?"Creating...":"Create academic year"}</button>
    {state.message&&<p className={`text-sm sm:col-span-2 ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}
  </form>;
}

export function AcademicYearStatusForm({yearId,archived}:{yearId:string;archived:boolean}){
  const[state,action,pending]=useActionState<ActionState,FormData>(setAcademicYearStatus,{});
  return <form action={action} className="mt-2"><input type="hidden" name="yearId" value={yearId}/><input type="hidden" name="action" value={archived?"restore":"archive"}/><button className="link text-sm" disabled={pending}>{pending?"Saving...":archived?"Restore":"Archive"}</button>{state.message&&<span className={`ml-2 text-xs ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</span>}</form>;
}

export function CurriculumVersionCreateForm({courses}:{courses:{id:string;title:string}[]}){
  const[state,action,pending]=useActionState<ActionState,FormData>(createCurriculumVersion,{});
  return <form action={action} className="card mt-6 grid gap-4">
    <div><p className="eyebrow">Version control</p><h2 className="mt-2 text-2xl font-bold">Create a curriculum version</h2><p className="mt-2 text-sm text-slate-600">The previous active version is archived rather than overwritten.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm font-semibold">Course<select className="input" name="courseId" required>{courses.map(course=><option value={course.id} key={course.id}>{course.title}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Version label<input className="input" name="label" placeholder="Specification 2027" required/></label>
      <label className="grid gap-1 text-sm font-semibold">Specification year<input className="input" name="specificationYear" type="number" min="2000" max="2200" required/></label>
      <label className="grid gap-1 text-sm font-semibold">Source reference<input className="input" name="sourceReference" placeholder="Awarding body URL or document reference"/></label>
    </div>
    <label className="grid gap-1 text-sm font-semibold">Teacher notes<textarea className="input min-h-20" name="teacherNotes"/></label>
    <button className="button-secondary justify-self-start" disabled={pending}>{pending?"Creating...":"Create and activate version"}</button>
    {state.message&&<p className={`text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}
  </form>;
}

export function CurriculumVersionStatusForm({versionId,active}:{versionId:string;active:boolean}){
  const[state,action,pending]=useActionState<ActionState,FormData>(setCurriculumVersionStatus,{});
  return <form action={action} className="mt-1"><input type="hidden" name="versionId" value={versionId}/><input type="hidden" name="action" value={active?"archive":"activate"}/><button className="link text-xs" disabled={pending}>{pending?"Saving...":active?"Archive version":"Activate version"}</button>{state.message&&<span className={`ml-2 text-xs ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</span>}</form>;
}

export function CourseStatusForm({courseId,active}:{courseId:string;active:boolean}){
  const[state,action,pending]=useActionState<ActionState,FormData>(setCourseStatus,{});
  return <form action={action} className="mt-2"><input type="hidden" name="courseId" value={courseId}/><input type="hidden" name="action" value={active?"archive":"activate"}/><button className="link text-sm" disabled={pending}>{pending?"Saving...":active?"Archive course":"Restore course"}</button>{state.message&&<span className={`ml-2 text-xs ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</span>}</form>;
}

export function LearnerDeletionRequestForm({learnerId}:{learnerId:string}){
  const[state,action,pending]=useActionState<ActionState,FormData>(requestLearnerDataDeletion,{});
  return <details className="mt-3 rounded-lg border border-red-200 p-3"><summary className="cursor-pointer text-sm font-bold text-red-800">Request personal-data deletion</summary><form action={action} className="mt-3 grid gap-3"><input type="hidden" name="learnerId" value={learnerId}/><p className="text-xs text-slate-600">Export the learner’s evidence first. This creates a pending request and does not delete anything yet.</p><label className="grid gap-1 text-sm font-semibold">Authorised reason<textarea className="input min-h-20" name="reason" placeholder="For example: confirmed test account" required/></label><p className="text-xs text-slate-500">Enter at least 10 characters. If anything is missing, an error will appear here.</p><button className="button-secondary justify-self-start" disabled={pending}>{pending?"Requesting...":"Create deletion request"}</button>{state.message&&<p role="status" className={`text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}</form></details>;
}

export function LearnerDeletionExecuteForm({request}:{request:{id:string;reason:string;requested_at:string;user_profiles:{display_name:string}|{display_name:string}[]|null}}){
  const[state,action,pending]=useActionState<ActionState,FormData>(executeLearnerDataDeletion,{});
  const learner=Array.isArray(request.user_profiles)?request.user_profiles[0]:request.user_profiles;
  return <form action={action} className="rounded-xl border border-red-200 bg-red-50 p-4"><input type="hidden" name="requestId" value={request.id}/><strong>{learner?.display_name??"Learner"}</strong><p className="mt-1 text-sm text-slate-700">{request.reason}</p><p className="mt-1 text-xs text-slate-500">Requested {new Date(request.requested_at).toLocaleString("en-GB")}</p><label className="mt-3 grid gap-1 text-sm font-semibold">Type DELETE LEARNER DATA<input className="input bg-white" name="confirmation" autoComplete="off" required/></label><button className="button-secondary mt-3" disabled={pending}>{pending?"Deleting...":"Authorise permanent deletion"}</button>{state.message&&<p className={`mt-2 text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}</form>;
}

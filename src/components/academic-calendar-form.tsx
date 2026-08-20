"use client";

import { useActionState } from "react";
import { saveCalendarEvent, type ActionState } from "@/app/actions/learning";

type CalendarEvent={
  id:string;academic_year_id:string;academic_period_id:string|null;
  title:string;kind:string;starts_on:string;ends_on:string;
  metadata:unknown;
};

export function AcademicCalendarForm({
  years,periods,event,
}:{
  years:{id:string;name:string}[];
  periods:{id:string;name:string;academic_year_id:string}[];
  event?:CalendarEvent;
}){
  const[state,action,pending]=useActionState<ActionState,FormData>(saveCalendarEvent,{});
  const note=event?.metadata&&typeof event.metadata==="object"&&"note" in event.metadata
    ? String((event.metadata as {note?:unknown}).note??""):"";
  return <form action={action} className="grid gap-3 rounded-xl border border-slate-200 p-4">
    <input type="hidden" name="eventId" value={event?.id??""}/>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="grid gap-1 text-sm font-semibold">Academic year<select className="input" name="academicYearId" defaultValue={event?.academic_year_id} required><option value="">Choose a year</option>{years.map(year=><option value={year.id} key={year.id}>{year.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Term / semester<select className="input" name="academicPeriodId" defaultValue={event?.academic_period_id??""}><option value="">Whole year / no period</option>{periods.map(period=><option value={period.id} key={period.id}>{period.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Event type<select className="input" name="kind" defaultValue={event?.kind??"teaching_week"}>{[["holiday","Holiday"],["teaching_week","Teaching week"],["progress_point_week","Progress-point week"],["review_week","Review week"],["examination_reminder","Examination reminder"]].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Title<input className="input" name="title" defaultValue={event?.title??""} required/></label>
      <label className="grid gap-1 text-sm font-semibold">Starts<input className="input" type="date" name="startsOn" defaultValue={event?.starts_on??""} required/></label>
      <label className="grid gap-1 text-sm font-semibold">Ends<input className="input" type="date" name="endsOn" defaultValue={event?.ends_on??""} required/></label>
    </div>
    <label className="grid gap-1 text-sm font-semibold">Learner-facing note<input className="input" name="note" defaultValue={note}/></label>
    <div className="flex flex-wrap items-center gap-4">
      <button className="button-secondary" disabled={pending}>{pending?"Saving…":event?"Update event":"Add event"}</button>
      {event&&<label className="flex items-center gap-2 text-sm font-semibold text-red-700"><input type="checkbox" name="archive"/>Archive this event</label>}
    </div>
    {state.message&&<p className={`text-sm ${state.ok?"text-teal-800":"text-red-700"}`}>{state.message}</p>}
  </form>;
}

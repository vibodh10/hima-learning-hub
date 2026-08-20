"use client";

import { useMemo, useState } from "react";

type Course={id:string;title:string;qualification_type:string|null};
type Unit={id:string;course_id:string;code:string;title:string;kind:string};
type Aim={id:string;unit_id:string;title:string};
type Topic={id:string;unit_id:string;learning_aim_id:string|null;title:string;status:string};
type Skill={id:string;topic_id:string;title:string};
type Lesson={id:string;topic_id:string;title:string;status:string};
type Activity={id:string;lesson_id:string;title:string;learning_stage:string|null;status:string};
type Question={id:string;skill_id:string|null;status:string};
type ClassUnit={class_id:string;unit_id:string;classes:{name:string}|{name:string}[]|null};
type Progress={topic_id:string;latest_score:number|string;current_pathway:string};
type Misconception={skills:{topic_id:string}|{topic_id:string}[]|null;title:string;occurrence_count?:number};

export function CurriculumExplorer(props:{
  courses:Course[];units:Unit[];aims:Aim[];topics:Topic[];skills:Skill[];
  lessons:Lesson[];activities:Activity[];questions:Question[];classUnits:ClassUnit[];
  progress:Progress[];misconceptions:Misconception[];
}){
  const[courseId,setCourseId]=useState(props.courses[0]?.id??"");
  const visibleUnits=useMemo(()=>props.units.filter(unit=>unit.course_id===courseId),[props.units,courseId]);
  const[unitChoice,setUnitChoice]=useState("");
  const unitId=visibleUnits.some(unit=>unit.id===unitChoice)?unitChoice:(visibleUnits[0]?.id??"");
  const visibleAims=props.aims.filter(aim=>aim.unit_id===unitId);
  const[aimChoice,setAimChoice]=useState("");
  const aimId=visibleAims.some(aim=>aim.id===aimChoice)?aimChoice:(visibleAims[0]?.id??"");
  const visibleTopics=props.topics.filter(topic=>topic.unit_id===unitId&&(!aimId||topic.learning_aim_id===aimId));
  const[topicChoice,setTopicChoice]=useState("");
  const topicId=visibleTopics.some(topic=>topic.id===topicChoice)?topicChoice:(visibleTopics[0]?.id??"");
  const visibleSkills=props.skills.filter(skill=>skill.topic_id===topicId);
  const[skillChoice,setSkillChoice]=useState("");
  const skillId=visibleSkills.some(skill=>skill.id===skillChoice)?skillChoice:(visibleSkills[0]?.id??"");
  const lessons=props.lessons.filter(lesson=>lesson.topic_id===topicId);
  const lessonIds=new Set(lessons.map(lesson=>lesson.id));
  const activities=props.activities.filter(activity=>lessonIds.has(activity.lesson_id));
  const stageCounts=activities.reduce<Record<string,number>>((counts,activity)=>{
    const stage=activity.learning_stage??"practice";
    counts[stage]=(counts[stage]??0)+1;
    return counts;
  },{});
  const classNames=[...new Set(props.classUnits.filter(item=>item.unit_id===unitId).map(item=>related(item.classes)?.name).filter(Boolean))];
  const progress=props.progress.filter(item=>item.topic_id===topicId);
  const average=progress.length?Math.round(progress.reduce((sum,item)=>sum+Number(item.latest_score),0)/progress.length):null;
  const questionCount=props.questions.filter(question=>question.skill_id===skillId).length;
  const misconceptions=props.misconceptions.filter(item=>related(item.skills)?.topic_id===topicId);
  const selectedCourse=props.courses.find(course=>course.id===courseId);

  return <section className="card mt-8" id="catalogue">
    <p className="eyebrow">Complete curriculum catalogue</p>
    <h2 className="mt-2 text-2xl font-bold">Curriculum and evidence explorer</h2>
    <p className="mt-2 text-sm text-slate-600">Choose each level to inspect approved and draft content, question coverage, classes, progress and misconceptions.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Select label="Course" value={courseId} onChange={setCourseId} options={props.courses.map(item=>({id:item.id,title:item.title}))}/>
      <Select label="Unit / Content Area" value={unitId} onChange={value=>{setUnitChoice(value);setAimChoice("");setTopicChoice("");setSkillChoice("")}} options={visibleUnits.map(item=>({id:item.id,title:`${item.code.match(/^\d+$/)?`Unit ${item.code}: `:""}${item.title}`}))}/>
      <Select label="Learning Aim / Performance Area" value={aimId} onChange={value=>{setAimChoice(value);setTopicChoice("");setSkillChoice("")}} options={visibleAims.map(item=>({id:item.id,title:item.title}))}/>
      <Select label="Topic" value={topicId} onChange={value=>{setTopicChoice(value);setSkillChoice("")}} options={visibleTopics.map(item=>({id:item.id,title:`${item.title} · ${item.status}`}))}/>
      <Select label="Skill" value={skillId} onChange={setSkillChoice} options={visibleSkills.map(item=>({id:item.id,title:item.title}))}/>
    </div>
    <p className="mt-4 text-xs font-bold uppercase tracking-wide text-teal-700">{selectedCourse?.qualification_type==="T Level"?"T Level Content Areas and Occupational Specialism":"BTEC Units"}</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Teaching screens / lessons" value={String(lessons.length)}/>
      <Metric label="Activities" value={String(activities.length)}/>
      <Metric label="Questions for selected skill" value={String(questionCount)}/>
      <Metric label="Latest topic average" value={average===null?"No evidence":`${average}%`}/>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-3">
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="font-bold">Learning stages</h3><div className="mt-3 grid gap-2 text-sm">{["learn","worked_example","guided_practice","core_practice","challenge_practice","mastery_check","retrieval_review"].map(stage=><p key={stage}><span className="capitalize">{stage.replaceAll("_"," ")}</span>: <strong>{stageCounts[stage]??0}</strong></p>)}</div></div>
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="font-bold">Classes using this unit</h3><div className="mt-3 grid gap-2 text-sm">{classNames.length?classNames.map(name=><p key={name}>{name}</p>):<p className="text-slate-500">Not selected by an authorised class.</p>}</div><p className="mt-4 text-sm">Learner pathways: {["Support","Core","Stretch","Mastery"].map(pathway=>`${pathway} ${progress.filter(item=>item.current_pathway===pathway).length}`).join(" · ")}</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="font-bold">Common misconceptions</h3><div className="mt-3 grid gap-2 text-sm">{misconceptions.length?misconceptions.slice(0,6).map((item,index)=><p key={`${item.title}-${index}`}>{item.title}</p>):<p className="text-slate-500">No misconception evidence for this topic.</p>}</div></div>
    </div>
  </section>;
}

function Select({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:{id:string;title:string}[]}){
  return <label className="grid gap-1 text-sm font-semibold">{label}<select className="input" value={value} onChange={event=>onChange(event.target.value)} disabled={!options.length}>{!options.length&&<option value="">None available</option>}{options.map(option=><option value={option.id} key={option.id}>{option.title}</option>)}</select></label>;
}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>}
function related<T>(value:T|T[]|null|undefined):T|undefined{return Array.isArray(value)?value[0]:value??undefined}


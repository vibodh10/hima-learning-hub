import "server-only";
import type {createClient} from "./supabase/server";
import type {MiniStudyRecord,StudyIntegrityEvent,StudyIntervention,StudyLegacyBaseline,StudyPracticeMiss} from "./mini-study-report";
import {studyDay} from "./mini-study";
import {practiceWeekEnd,practiceWeekStart} from "./mini-study-attendance";

type Page<T>={data:T[]|null;error:unknown;count:number|null};
/** Never silently turn the database's default row limit into a complete report. */
export async function allStudyRows<T>(query:(from:number,to:number)=>PromiseLike<Page<T>>):Promise<T[]> {
  const rows:T[]=[];
  let expected:number|undefined;
  for(let from=0;from<10000;from+=200){
    const result=await query(from,from+199);
    if(result.error||!result.data||result.count===null)throw new Error("Learning evidence could not be loaded completely.");
    if(result.count>10000)throw new Error("This report is too large to load safely.");
    if(expected!==undefined&&expected!==result.count)throw new Error("Learning evidence changed. Please refresh the report.");
    expected=result.count;
    rows.push(...result.data);
    if(rows.length===expected)return rows;
    if(result.data.length!==200||rows.length>expected)throw new Error("Learning evidence could not be loaded completely.");
  }
  throw new Error("This report is too large to load safely.");
}

/** Caller must first check role and can_manage_class. Evidence is scoped to the group's active units and retains unit identity. */
export async function loadMiniStudyEvidence(client:Awaited<ReturnType<typeof createClient>>,classId:string,unitIds:string|string[]|null){
  const roster=await allStudyRows((from,to)=>client.from("enrolments")
    .select("student_id,user_profiles!enrolments_student_id_fkey(display_name)",{count:"exact"})
    .eq("class_id",classId).is("archived_at",null).order("student_id").range(from,to));
  const learners=roster.map(r=>({id:r.student_id,name:(Array.isArray(r.user_profiles)?r.user_profiles[0]:r.user_profiles)?.display_name??"Learner"}));
  const activeUnitIds=Array.isArray(unitIds)?unitIds:unitIds?[unitIds]:[];
  if(!activeUnitIds.length||!learners.length)return {learners,records:[] as MiniStudyRecord[],baselines:[] as StudyLegacyBaseline[],integrityEvents:[] as StudyIntegrityEvent[],practiceMisses:[] as StudyPracticeMiss[],interventions:[] as StudyIntervention[]};
  const ids=new Set(learners.map(l=>l.id));
  const records=await allStudyRows((from,to)=>client.from("mini_study_sessions")
    .select("id,learner_id,unit_id,lesson_id,kind,status,content,grade,target_text,needs_help,checked_at,completed_at",{count:"exact"})
    .eq("class_id",classId).in("unit_id",activeUnitIds).neq("status","abandoned").order("id").range(from,to));
  const baselines:StudyLegacyBaseline[]=[];
  for(let offset=0;offset<learners.length;offset+=100){
    baselines.push(...await allStudyRows((from,to)=>client.from("unit_starting_point_baselines")
      .select("learner_id,unit_id,correct_count,question_count,completed_at",{count:"exact"}).in("unit_id",activeUnitIds)
      .in("learner_id",learners.slice(offset,offset+100).map(l=>l.id)).order("id").range(from,to)));
  }
  const scopedRecords=records.filter(r=>ids.has(r.learner_id)) as MiniStudyRecord[];
  const integrityEvents:StudyIntegrityEvent[]=[];
  try{
    const sessionIds=scopedRecords.map(record=>record.id);
    for(let offset=0;offset<sessionIds.length;offset+=100){
      const chunk=sessionIds.slice(offset,offset+100);
      if(!chunk.length)continue;
      integrityEvents.push(...await allStudyRows((from,to)=>client.from("mini_study_integrity_events")
        .select("session_id,event_type,occurred_at",{count:"exact"}).in("session_id",chunk)
        .order("occurred_at").range(from,to)) as StudyIntegrityEvent[]);
    }
  }catch{
    // Table may not exist for the brief period between app deploy and db push.
  }
  const practiceMisses:StudyPracticeMiss[]=[];
  const interventions:StudyIntervention[]=[];
  try{
    const today=studyDay(new Date());const weekStart=practiceWeekStart(today),weekEnd=practiceWeekEnd(today);
    for(let offset=0;offset<learners.length;offset+=100){
      const learnerIds=learners.slice(offset,offset+100).map(l=>l.id);
      practiceMisses.push(...await allStudyRows((from,to)=>client.from("mini_study_practice_misses")
        .select("id,learner_id,class_id,unit_id,missed_on,learner_notified_at,teacher_notified_at,created_at",{count:"exact"})
        .eq("class_id",classId).in("learner_id",learnerIds).gte("missed_on",weekStart).lte("missed_on",weekEnd)
        .order("missed_on").range(from,to)) as StudyPracticeMiss[]);
      interventions.push(...await allStudyRows((from,to)=>client.from("interventions")
        .select("id,learner_id,class_id,kind,status,evidence,note,created_at,resolved_at",{count:"exact"})
        .eq("class_id",classId).in("learner_id",learnerIds).eq("kind","missed_self_study").eq("status","open")
        .order("created_at").range(from,to)) as StudyIntervention[]);
    }
  }catch{
    // Attendance migration may be applied immediately after the app deploy.
  }
  return {learners,records:scopedRecords,baselines,integrityEvents,practiceMisses,interventions};
}

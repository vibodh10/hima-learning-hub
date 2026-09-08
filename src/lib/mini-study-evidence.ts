import "server-only";
import type {createClient} from "./supabase/server";
import type {MiniStudyRecord,StudyLegacyBaseline} from "./mini-study-report";

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

/** Caller must first check role and can_manage_class. This uses the caller's RLS client. */
export async function loadMiniStudyEvidence(client:Awaited<ReturnType<typeof createClient>>,classId:string,unitId:string|null){
  const roster=await allStudyRows((from,to)=>client.from("enrolments")
    .select("student_id,user_profiles!enrolments_student_id_fkey(display_name)",{count:"exact"})
    .eq("class_id",classId).is("archived_at",null).order("student_id").range(from,to));
  const learners=roster.map(r=>({id:r.student_id,name:(Array.isArray(r.user_profiles)?r.user_profiles[0]:r.user_profiles)?.display_name??"Learner"}));
  if(!unitId||!learners.length)return {learners,records:[] as MiniStudyRecord[],baselines:[] as StudyLegacyBaseline[]};
  const ids=new Set(learners.map(l=>l.id));
  const records=await allStudyRows((from,to)=>client.from("mini_study_sessions")
    .select("id,learner_id,kind,status,content,grade,target_text,needs_help,checked_at,completed_at",{count:"exact"})
    .eq("class_id",classId).eq("unit_id",unitId).neq("status","abandoned").order("id").range(from,to));
  const baselines:StudyLegacyBaseline[]=[];
  for(let offset=0;offset<learners.length;offset+=100){
    baselines.push(...await allStudyRows((from,to)=>client.from("unit_starting_point_baselines")
      .select("learner_id,correct_count,question_count,completed_at",{count:"exact"}).eq("unit_id",unitId)
      .in("learner_id",learners.slice(offset,offset+100).map(l=>l.id)).order("id").range(from,to)));
  }
  return {learners,records:records.filter(r=>ids.has(r.learner_id)) as MiniStudyRecord[],baselines};
}

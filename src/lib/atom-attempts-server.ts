import "server-only";
import {getSessionProfile} from "./auth";
import {createClient} from "./supabase/server";

export type AtomAttemptSummary={id:string;kind:"topic_practice"|"practice_paper";unitCode:string;topicCode:string|null;paperMode:"knowledge"|"applied"|"assignment"|null;selectedLevel:string|null;percentage:number;mark:number;maxMark:number;hintsUsed:number;activeSeconds:number;completedAt:string;teacherMark:number|null;teacherFeedback:string|null;reviewedAt:string|null;hasSubmittedResponses:boolean};

export async function loadAtomAttempts():Promise<AtomAttemptSummary[]>{
 const actor=await getSessionProfile();if(!actor||actor.role!=="student")return[];
 const supabase=await createClient();const{data,error}=await supabase.from("learner_curriculum_attempts").select("id,kind,unit_code,topic_code,paper_mode,selected_level,percentage,mark,max_mark,hints_used,active_seconds,completed_at,teacher_mark,teacher_feedback,reviewed_at,question_results").eq("learner_id",actor.id).order("completed_at",{ascending:false}).limit(200);
 if(error||!data)return[];
 return data.map(item=>({id:item.id,kind:item.kind as AtomAttemptSummary["kind"],unitCode:item.unit_code,topicCode:item.topic_code,paperMode:item.paper_mode as AtomAttemptSummary["paperMode"],selectedLevel:item.selected_level,percentage:Number(item.percentage),mark:item.mark,maxMark:item.max_mark,hintsUsed:item.hints_used,activeSeconds:item.active_seconds,completedAt:item.completed_at,teacherMark:item.teacher_mark,teacherFeedback:item.teacher_feedback,reviewedAt:item.reviewed_at,hasSubmittedResponses:Array.isArray(item.question_results)&&item.question_results.some((result:unknown)=>Boolean(result&&typeof result==="object"&&"answer" in result))}));
}

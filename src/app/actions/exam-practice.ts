"use server";
import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {unit14Papers} from "@/lib/unit14-exam";
export type ExamPracticeState={ok?:boolean;message?:string;id?:string};
export async function submitExamPractice(_:ExamPracticeState,form:FormData):Promise<ExamPracticeState>{
 await requireRole("student");
 const classId=String(form.get("classId")??"");const paper=String(form.get("paper")??"");
 const raw=String(form.get("activity")??"");const activity=Number(raw);const response=String(form.get("response")??"").trim();
 if(!/^[0-9a-f-]{36}$/i.test(classId)||!/^\d$/.test(raw)||activity>4||response.length<40||response.length>50000||!(paper==="guided"||unit14Papers.some(p=>p.id===paper)))return {message:"Choose a task and write your own response (40–50,000 characters)."};
 const client=await createClient();
 const {data,error}=await client.from("exam_practice_attempts").insert({class_id:classId,paper_id:paper,activity,response}).select("id").single();
 if(error)return {message:"Your attempt was not saved. Check your group access and try again."};
 revalidatePath("/study/unit14-exam");return {ok:true,id:data.id,message:"Your attempt is saved. Now compare it with the guidance below."};
}
export async function reflectExamPractice(_:ExamPracticeState,form:FormData):Promise<ExamPracticeState>{
 const actor=await requireRole("student");const id=String(form.get("id")??"");const reflection=String(form.get("reflection")??"").trim();
 if(!/^[0-9a-f-]{36}$/i.test(id)||reflection.length<20||reflection.length>6000)return {message:"Write a specific improvement (20–6,000 characters)."};
 const client=await createClient();const {data,error}=await client.from("exam_practice_attempts").update({reflection,reviewed_at:new Date().toISOString()}).eq("id",id).eq("learner_id",actor.id).select("id").single();
 if(error||!data)return {message:"Your review was not saved. Please try again."};
 revalidatePath("/study/unit14-exam");return {ok:true,message:"Review saved. You can stop here or try another task."};
}

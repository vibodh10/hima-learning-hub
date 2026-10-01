"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {getSessionProfile} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";

const assessmentSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(180),
  purpose: z.string().trim().max(1000),
  questions: z.array(z.string().trim().min(3).max(2000)).min(1).max(20),
});

const saveSchema = z.object({
  classId: z.string().uuid().nullable(),
  sourceName: z.string().trim().max(255),
  publish: z.boolean(),
  assessments: z.array(assessmentSchema).min(1).max(6),
});

export type SowAssessmentSaveResult =
  | {ok:true;message:string;ids:string[]}
  | {ok:false;message:string};

export async function saveSowAssessments(input:unknown):Promise<SowAssessmentSaveResult>{
  const actor=await getSessionProfile();
  if(!actor || !["teacher","administrator"].includes(actor.role))return {ok:false,message:"Sign in as a teacher to save assessments."};
  const parsed=saveSchema.safeParse(input);
  if(!parsed.success)return {ok:false,message:"Check the class, titles and questions before saving."};
  if(parsed.data.publish && !parsed.data.classId)return {ok:false,message:"Choose a class before publishing."};

  const admin=createAdminClient();
  if(parsed.data.classId){
    const {data:allowed,error:allowedError}=await admin.rpc("can_manage_class",{class_uuid:parsed.data.classId});
    if(allowedError||!allowed)return {ok:false,message:"You do not have permission to publish to this class."};
  }

  const ids:string[]=[];
  for(const item of parsed.data.assessments){
    const payload={
      created_by:actor.id,
      class_id:parsed.data.classId,
      source_name:parsed.data.sourceName||null,
      title:item.title,
      purpose:item.purpose,
      questions:item.questions,
      status:parsed.data.publish?"published":"draft",
      published_at:parsed.data.publish?new Date().toISOString():null,
      updated_at:new Date().toISOString(),
    };
    if(item.id){
      const {data,error}=await admin.from("sow_formative_assessments").update(payload)
        .eq("id",item.id).eq("created_by",actor.id).select("id").maybeSingle();
      if(error||!data)return {ok:false,message:"The assessment draft could not be updated."};
      ids.push(data.id);
    }else{
      const {data,error}=await admin.from("sow_formative_assessments").insert(payload).select("id").single();
      if(error||!data)return {ok:false,message:"The assessment draft could not be saved."};
      ids.push(data.id);
    }
  }
  revalidatePath("/dashboard");
  if(parsed.data.classId){
    revalidatePath(`/teacher/classes/${parsed.data.classId}`);
    revalidatePath(`/teacher/classes/${parsed.data.classId}/sow-assessments`);
  }
  revalidatePath("/study");
  return {ok:true,ids,message:parsed.data.publish?"Published to the selected class.":"Drafts saved."};
}

const submissionSchema=z.object({
  assessmentId:z.string().uuid(),
  responses:z.array(z.string().trim().max(6000)).min(1).max(20),
});

export async function submitSowFormativeAssessment(input:unknown){
  const actor=await getSessionProfile();
  if(!actor||actor.role!=="student")return {ok:false,message:"Sign in as a student to submit this assessment."};
  const parsed=submissionSchema.safeParse(input);
  if(!parsed.success)return {ok:false,message:"Check your answers and try again."};
  const admin=createAdminClient();
  const {data:assessment,error}=await admin.from("sow_formative_assessments")
    .select("id,class_id,questions,status").eq("id",parsed.data.assessmentId).maybeSingle();
  if(error||!assessment||assessment.status!=="published"||!assessment.class_id)return {ok:false,message:"This assessment is not currently available."};
  const questionCount=Array.isArray(assessment.questions)?assessment.questions.length:0;
  if(parsed.data.responses.length!==questionCount)return {ok:false,message:"Answer every question before submitting."};
  const {data:enrolment}=await admin.from("enrolments").select("student_id").eq("class_id",assessment.class_id)
    .eq("student_id",actor.id).is("archived_at",null).maybeSingle();
  if(!enrolment)return {ok:false,message:"This assessment is not assigned to your group."};
  const {error:saveError}=await admin.from("sow_formative_submissions").upsert({
    assessment_id:assessment.id,learner_id:actor.id,responses:parsed.data.responses,submitted_at:new Date().toISOString()
  },{onConflict:"assessment_id,learner_id"});
  if(saveError)return {ok:false,message:"Your answers could not be saved. Please try again."};
  revalidatePath("/study");
  revalidatePath(`/study/formative/${assessment.id}`);
  revalidatePath(`/teacher/classes/${assessment.class_id}/sow-assessments`);
  return {ok:true,message:"Assessment submitted. Your tutor can now review your answers."};
}

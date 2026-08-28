"use server";

import {z} from "zod";
import {getSessionProfile} from "@/lib/auth";
import {configuredUnits} from "@/lib/learning-catalog";
import {createClient} from "@/lib/supabase/server";
import {revalidatePath} from "next/cache";
import {hasAssignedCurriculumUnit} from "@/lib/curriculum-access";
import {isConfiguredUnitCode} from "@/lib/curriculum-unit-code";

const resultSchema=z.object({
 id:z.string().min(1).max(100), difficulty:z.number().int().min(1).max(4), correct:z.boolean(), hintsUsed:z.number().int().min(0).max(5), marks:z.number().int().min(1).max(20),awardedMarks:z.number().int().min(0).max(20),answer:z.string().max(20000).optional()
});
const attemptSchema=z.object({
 kind:z.enum(["topic_practice","practice_paper"]),unitCode:z.string().refine(isConfiguredUnitCode),topicCode:z.string().min(1).max(20).nullable(),paperMode:z.enum(["knowledge","applied","assignment"]).nullable(),
 selectedLevel:z.enum(["Support","Core","Stretch","Challenge"]).nullable(),percentage:z.number().min(0).max(100),mark:z.number().int().min(0),maxMark:z.number().int().min(1),hintsUsed:z.number().int().min(0),activeSeconds:z.number().int().min(1).max(86400),results:z.array(resultSchema).min(1).max(100)
});
export type AtomAttemptInput=z.infer<typeof attemptSchema>;

export async function saveAtomAttempt(input:AtomAttemptInput):Promise<{ok:boolean;message:string}>{
 const actor=await getSessionProfile();
 if(!actor||actor.role!=="student")return{ok:false,message:"Your result is saved on this device. Sign in as a student to add it to reports."};
 const parsed=attemptSchema.safeParse(input);if(!parsed.success)return{ok:false,message:"This question result could not be validated."};
 const data=parsed.data,unit=configuredUnits.find(item=>item.code===data.unitCode);
 if(!unit||(data.kind==="topic_practice"&&(!unit.topics.some(item=>item.code===data.topicCode)||data.paperMode!==null))||(data.kind==="practice_paper"&&(data.topicCode!==null||data.paperMode===null)))return{ok:false,message:"This result is not linked to the configured curriculum."};
 if(!await hasAssignedCurriculumUnit(data.unitCode))return{ok:false,message:"This unit is not assigned to your student group."};
 const supabase=await createClient();
 const{error}=await supabase.from("learner_curriculum_attempts").insert({learner_id:actor.id,kind:data.kind,unit_code:data.unitCode,topic_code:data.topicCode,paper_mode:data.paperMode,selected_level:data.selectedLevel,percentage:data.percentage,mark:data.mark,max_mark:data.maxMark,hints_used:data.hintsUsed,active_seconds:data.activeSeconds,question_results:data.results});
 if(error)return{ok:false,message:"Saved on this device; account reporting will begin after the latest database migration is applied."};
 return{ok:true,message:"Result added to your learner and teacher progress reports."};
}

const reviewSchema=z.object({
 attemptId:z.uuid(),learnerId:z.uuid(),mark:z.coerce.number().int().min(0),
 feedback:z.string().trim().min(10,"Give the learner specific feedback.").max(3000),
});

export type CurriculumReviewState={ok?:boolean;message?:string;errors?:Record<string,string[]>};

export async function reviewCurriculumAttempt(_:CurriculumReviewState,formData:FormData):Promise<CurriculumReviewState>{
 const actor=await getSessionProfile();
 if(!actor||!['teacher','administrator'].includes(actor.role))return{message:"Only a teacher or administrator can review practical evidence."};
 const parsed=reviewSchema.safeParse(Object.fromEntries(formData));
 if(!parsed.success)return{errors:parsed.error.flatten().fieldErrors};
 const supabase=await createClient();
 const{data:attempt}=await supabase.from("learner_curriculum_attempts").select("id,learner_id,max_mark,kind").eq("id",parsed.data.attemptId).eq("learner_id",parsed.data.learnerId).eq("kind","practice_paper").single();
 if(!attempt)return{message:"This paper is not available for your review."};
 if(parsed.data.mark>attempt.max_mark)return{errors:{mark:[`The mark cannot exceed ${attempt.max_mark}.`]}};
 const percentage=Math.round(parsed.data.mark/attempt.max_mark*100);
 const{error}=await supabase.from("learner_curriculum_attempts").update({teacher_mark:parsed.data.mark,teacher_feedback:parsed.data.feedback,reviewed_by:actor.id,reviewed_at:new Date().toISOString(),mark:parsed.data.mark,percentage}).eq("id",attempt.id);
 if(error)return{message:"The review could not be saved. Apply the latest database migration, then try again."};
 revalidatePath(`/teacher/learners/${parsed.data.learnerId}`);revalidatePath("/progress");
 return{ok:true,message:"The final mark and teacher feedback are now visible in learner and teacher reports."};
}

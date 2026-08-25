"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth";
import { configuredUnits } from "@/lib/learning-catalog";
import { createClient } from "@/lib/supabase/server";

export type WorksheetState = { ok?: boolean; message?: string; errors?: Record<string, string[]> };

const response = z.string().trim().max(6000);
const worksheet = z.object({
  unitCode: z.enum(["2", "4", "6"]),
  topicCode: z.string().trim().min(1).max(40),
  mode: z.enum(["standard", "catch_up", "improvement"]),
  evidenceStage: z.enum(["before", "learning", "progress_check_1", "progress_check_2", "after"]),
  recap: response,
  objectives: response,
  keyKnowledge: response,
  workedExample: response,
  mainTask: response,
  practicalApplication: response,
  challenge: response,
  knowledgeCheck: response,
  feedbackChecking: response,
  improvement: response,
  todayCan: response,
  difficult: response,
  improved: response,
  help: response,
  exitTicket: response,
  confidence: z.coerce.number().int().min(1).max(5),
});

export async function submitTopicWorksheet(_: WorksheetState, formData: FormData): Promise<WorksheetState> {
  const actor = await getSessionProfile();
  if (!actor || actor.role !== "student") return { message: "Sign in as a student to save worksheet evidence." };
  const parsed = worksheet.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors, message: "Check the worksheet responses and confidence rating." };
  const unit = configuredUnits.find(item => item.code === parsed.data.unitCode);
  const topic = unit?.topics.find(item => item.code === parsed.data.topicCode);
  if (!unit || !topic) return { message: "This worksheet is not linked to the configured curriculum." };
  const { unitCode, topicCode, mode, evidenceStage, confidence, ...responses } = parsed.data;
  if (![responses.mainTask, responses.practicalApplication, responses.knowledgeCheck, responses.todayCan, responses.exitTicket].some(Boolean)) {
    return { message: "Add your main-task, knowledge-check or reflection evidence before saving." };
  }

  const supabase = await createClient();
  if (mode === "catch_up") {
    const { error: catchUpError } = await supabase.rpc("begin_my_topic_catch_up", {
      unit_code_value: unitCode,
      topic_code_value: topicCode,
    });
    if (catchUpError) return { message: "Catch-up is available after your group starts this unit journey." };
  }
  const { data:worksheetId,error } = await supabase.rpc("submit_my_topic_worksheet", {
    unit_code_value: unitCode,
    topic_code_value: topicCode,
    mode_value: mode,
    milestone_value: evidenceStage,
    responses_value: responses,
    confidence_value: confidence,
  });
  if (error) {
    console.error("submit_my_topic_worksheet failed", { code: error.code, message: error.message });
    return { message: "The worksheet could not be added to your portfolio. Your responses remain on this page so you can retry." };
  }
  const{data:achievementPoints,error:achievementError}=await supabase.rpc("apply_worksheet_achievement_points",{
    worksheet_uuid:worksheetId,
  });
  if(achievementError)console.error("apply_worksheet_achievement_points failed",{code:achievementError.code,message:achievementError.message});
  revalidatePath("/dashboard");
  revalidatePath("/portfolio");
  revalidatePath(`/curriculum/units/${unitCode}/topics/${encodeURIComponent(topicCode)}`);
  return { ok: true, message: `Worksheet saved as a new portfolio version. Earlier work has not been overwritten.${typeof achievementPoints==="number"&&achievementPoints>0?` +${achievementPoints} Achievement Points.`:""}` };
}

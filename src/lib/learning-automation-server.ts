import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Database authorization checks the learner, active enrolment and exact managed class. */
export async function refreshLearningAutomation(learnerId: string, classId?: string) {
  const client = await createClient();
  const result = classId ? { data: [{ class_id: classId }], error: null }
    : await client.from("enrolments").select("class_id,classes!inner(archived_at)").eq("student_id", learnerId).is("archived_at", null).is("classes.archived_at", null);
  if (result.error) throw new Error("Automatic learning records could not be checked.");
  for (const enrolment of result.data ?? []) {
    const { error } = await client.rpc("refresh_learner_automation", { learner_uuid: learnerId, class_uuid: enrolment.class_id });
    if (error) {
      console.error("Learning automation refresh failed", { code: error.code });
      throw new Error("Automatic learning records could not be updated. Please refresh to retry.");
    }
  }
}

/** Do not report a saved attempt as failed if its derived summary needs a retry. */
export async function refreshSavedLearningAutomation(learnerId: string) {
  try { await refreshLearningAutomation(learnerId); return true; }
  catch { return false; }
}

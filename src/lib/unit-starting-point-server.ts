import "server-only";
import { configuredUnits } from "./learning-catalog";
import { hasCompleteUnitStartingPoint } from "./unit-starting-point";
import { createClient } from "./supabase/server";

export async function loadUnitStartingPointStatus(learnerId: string, unitCode: string) {
  const unit = configuredUnits.find(item => item.code === unitCode);
  if (!unit) return { complete: false, completedAt: null as string | null };
  const supabase = await createClient();
  const { data } = await supabase.from("learner_curriculum_progress")
    .select("unit_code,topic_code,evidence,topic_started_at")
    .eq("learner_id", learnerId)
    .eq("unit_code", unitCode);
  const rows = data ?? [];
  const complete = hasCompleteUnitStartingPoint(rows, unitCode, unit.topics.map(topic => topic.code));
  const completedAt = complete
    ? rows.map(row => row.topic_started_at).filter((value): value is string => Boolean(value)).sort()[0] ?? null
    : null;
  return { complete, completedAt };
}

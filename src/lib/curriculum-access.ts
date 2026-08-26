import "server-only";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function requireCurriculumUnitAccess(unitCode: string) {
  const actor = await getSessionProfile();
  if (!actor) redirect("/login");
  if (actor.role !== "student") return actor;

  if (!await hasAssignedCurriculumUnit(unitCode)) redirect("/curriculum");
  return actor;
}

export async function hasAssignedCurriculumUnit(unitCode: string) {
  return (await assignedCurriculumUnitCodes()).includes(unitCode);
}

export async function assignedCurriculumUnitCodes() {
  const supabase = await createClient();
  const { data } = await supabase.from("class_units")
    .select("unit_id,units!inner(code),classes!inner(published)")
    .eq("classes.published", true)
    .eq("active", true)
    .is("archived_at", null)
  return [...new Set((data ?? []).map(row => related(row.units)?.code).filter((code): code is string => Boolean(code)))];
}

function related<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

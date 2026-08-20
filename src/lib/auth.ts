import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "student" | "teacher" | "administrator";

export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("user_profiles")
    .select("id, display_name, role, organisation_id").eq("id", user.id).single();
  if (error || !data) return null;
  return data as { id: string; display_name: string; role: Role; organisation_id: string };
});

export async function requireRole(...roles: Role[]) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!roles.includes(profile.role)) redirect("/dashboard");
  return profile;
}

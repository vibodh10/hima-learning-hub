"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type InvitationState = { ok?: boolean; message?: string; errors?: Record<string, string[]> };

const invitation = z.object({
  classId: z.uuid(),
  name: z.string().trim().min(2, "Enter the student's full name.").max(80),
  email: z.email("Enter a valid student email address.").trim().toLowerCase(),
});

export async function inviteStudent(_: InvitationState, formData: FormData): Promise<InvitationState> {
  const parsed = invitation.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const actor = await requireRole("teacher", "administrator");
  const sessionClient = await createClient();
  let classQuery = sessionClient.from("classes").select("id,name,organisation_id,teacher_id").eq("id", parsed.data.classId).is("archived_at", null);
  if (actor.role === "teacher") classQuery = classQuery.eq("teacher_id", actor.id);
  const { data: classData } = await classQuery.single();
  if (!classData || classData.organisation_id !== actor.organisation_id) return { message: "You can only invite students to your own active class." };

  const requestOrigin = (await headers()).get("origin");
  const origin = process.env.APP_URL?.replace(/\/$/, "") || requestOrigin;
  if (!origin) return { message: "The invitation link could not be created from this address." };
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
    data: { display_name: parsed.data.name, requested_role: "student", invited_class_id: classData.id },
  });
  if (error || !data.user) return { message: "The invitation could not be sent. This email may already have an account or the mail service may need configuring." };

  const { error: profileError } = await admin.from("user_profiles").upsert({
    id: data.user.id,
    organisation_id: actor.organisation_id,
    role: "student",
    display_name: parsed.data.name,
  }, { onConflict: "id" });
  const { error: enrolmentError } = profileError ? { error: profileError } : await admin.from("enrolments").upsert({
    class_id: classData.id,
    student_id: data.user.id,
    archived_at: null,
  }, { onConflict: "class_id,student_id" });
  if (profileError || enrolmentError) {
    if (!profileError) await admin.from("user_profiles").delete().eq("id", data.user.id);
    await admin.auth.admin.deleteUser(data.user.id);
    return { message: "The account invitation was cancelled because the class enrolment could not be created." };
  }
  await admin.from("audit_logs").insert({
    organisation_id: actor.organisation_id,
    actor_id: actor.id,
    action: "student.invited",
    entity_type: "class",
    entity_id: classData.id,
    after_data: { invited_user_id: data.user.id, invited_email: parsed.data.email },
  });
  revalidatePath(`/teacher/classes/${classData.id}`);
  return { ok: true, message: `Invitation sent to ${parsed.data.email}. The link is tied to that address; the student sets a password and is already assigned to ${classData.name}.` };
}

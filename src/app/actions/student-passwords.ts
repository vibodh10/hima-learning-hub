"use server";

import {z} from "zod";
import {requireRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";

export type StudentPasswordState = {ok?: boolean; message?: string};
const input = z.object({
  studentId: z.uuid(),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(10).refine(value => Buffer.byteLength(value, "utf8") <= 72),
  confirmPassword: z.string(),
  identityConfirmed: z.literal("on"),
}).refine(value => value.password === value.confirmPassword);

export async function setStudentPassword(_previous: StudentPasswordState, form: FormData): Promise<StudentPasswordState> {
  const actor = await requireRole("administrator");
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return {message: "Choose a student, enter their existing login email, confirm their identity and enter matching passwords of at least 10 characters (up to 72 bytes)."};
  const admin = createAdminClient();
  const {data: student, error: profileError} = await admin.from("user_profiles")
    .select("id,display_name,role,organisation_id,archived_at")
    .eq("id", parsed.data.studentId).eq("organisation_id", actor.organisation_id)
    .eq("role", "student").is("archived_at", null).maybeSingle();
  // Recheck all boundaries even if a caller tampers with the browser's selection.
  if (profileError || !student || student.role !== "student" || student.organisation_id !== actor.organisation_id || student.archived_at) {
    return {message: "Choose an active student in your organisation. No password was changed."};
  }
  const {data: account, error: accountError} = await admin.auth.admin.getUserById(student.id);
  if (accountError || !account.user || account.user.email?.toLowerCase() !== parsed.data.email) {
    return {message: "The existing login email does not match this student account. Check the original account details. No password was changed."};
  }
  if (!account.user.email_confirmed_at || (account.user.banned_until && Date.parse(account.user.banned_until) > Date.now())) {
    return {message: "This account is unconfirmed or suspended and needs a separate access review. No password was changed."};
  }
  const audit = {organisation_id: actor.organisation_id, actor_id: actor.id, entity_type: "user_profile", entity_id: student.id};
  const {error: auditError} = await admin.from("audit_logs").insert({...audit, action: "student.password_reset_requested", after_data: {method: "administrator", identity_confirmed: true}});
  if (auditError) return {message: "The account change could not be recorded. No password was changed. Please try again later."};

  // Only the existing user's password changes. No recovery email, new user,
  // email confirmation, role, membership or learning-record mutation is made.
  const {data: updated, error} = await admin.auth.admin.updateUserById(student.id, {password: parsed.data.password});
  const changed = !error && updated.user?.id === student.id;
  const {error: resultAuditError} = await admin.from("audit_logs").insert({...audit, action: changed ? "student.password_reset_completed" : "student.password_reset_failed", after_data: {method: "administrator"}});
  if (!changed) return {message: "The password could not be updated. Check the password meets your authentication policy and try again. The existing login email is unchanged."};
  if (resultAuditError) console.error("Student password reset completion audit failed", {studentId: student.id});
  return {ok: true, message: `${student.display_name}'s password has been updated. Give the new password privately to this student. They should sign in with their existing email. Their account and progress are unchanged.${resultAuditError ? " The completion audit could not be saved; the request audit was recorded." : ""}`};
}

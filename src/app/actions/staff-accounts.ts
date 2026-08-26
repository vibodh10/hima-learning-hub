"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { configuredAppOrigin, resolveAppOrigin } from "@/lib/app-origin";
import { requestedTeacherNames } from "@/lib/requested-teachers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type StaffAccountState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const teacherAccount = z.object({
  name: z.enum(requestedTeacherNames),
  email: z.email("Enter the tutor's verified email address.").trim().toLowerCase(),
});

export async function setupTeacherAccount(
  _previous: StaffAccountState,
  formData: FormData,
): Promise<StaffAccountState> {
  const actor = await requireRole("administrator");
  const parsed = teacherAccount.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const origin = resolveAppOrigin({
    configuredOrigin: configuredAppOrigin(),
    requestOrigin: (await headers()).get("origin"),
  });
  if (!origin) return { message: "The public application URL is not configured, so no account was created." };

  const admin = createAdminClient();
  const { data: directory, error: directoryError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (directoryError) return { message: "The account directory could not be checked. Nothing was changed." };

  const existingUser = directory.users.find(user => user.email?.trim().toLowerCase() === parsed.data.email);
  let userId = existingUser?.id;
  let created = false;

  if (existingUser) {
    const { data: profile } = await admin.from("user_profiles")
      .select("id,organisation_id,role,archived_at")
      .eq("id", existingUser.id)
      .maybeSingle();
    if (!profile || profile.organisation_id !== actor.organisation_id || profile.role !== "teacher" || profile.archived_at) {
      return { message: "That email already belongs to another or inactive account. No role or organisation was changed." };
    }
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: randomBytes(48).toString("base64url"),
      email_confirm: true,
      user_metadata: {
        display_name: parsed.data.name,
        requested_role: "teacher",
        invited_organisation_id: actor.organisation_id,
      },
    });
    if (error || !data.user) return { message: "The secure tutor account could not be created." };
    userId = data.user.id;
    created = true;

    const { error: profileError } = await admin.from("user_profiles").insert({
      id: userId,
      organisation_id: actor.organisation_id,
      role: "teacher",
      display_name: parsed.data.name,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return { message: "The tutor profile could not be created. The incomplete login was removed." };
    }
  }

  const sessionClient = await createClient();
  const { error: emailError } = await sessionClient.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });
  if (emailError) {
    return { message: created
      ? "The tutor account was created, but its password-setup email was not delivered. Submit this form again to retry safely."
      : "The tutor account already exists, but another password-setup email could not be sent yet." };
  }

  await admin.from("audit_logs").insert({
    organisation_id: actor.organisation_id,
    actor_id: actor.id,
    action: created ? "teacher.account_created" : "teacher.password_setup_resent",
    entity_type: "user_profile",
    entity_id: userId,
    after_data: { display_name: parsed.data.name, role: "teacher" },
  });
  revalidatePath("/admin");
  return { ok: true, message: created
    ? `${parsed.data.name}'s teacher account was created. A secure first-password link has been sent.`
    : `${parsed.data.name}'s account already existed. A fresh password-setup link has been sent.` };
}

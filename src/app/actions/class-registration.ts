"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { configuredAppOrigin, resolveAppOrigin } from "@/lib/app-origin";
import {
  classRegistrationTokenHash,
  findOpenClassRegistration,
  validClassRegistrationToken,
} from "@/lib/class-registration-links";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ClassRegistrationState = {
  ok?: boolean;
  message?: string;
  url?: string;
  errors?: Record<string, string[]>;
};

const classAction = z.object({ classId: z.uuid() });
const closeAction = classAction.extend({ linkId: z.uuid() });
const studentRegistration = z.object({
  token: z.string().refine(validClassRegistrationToken),
  name: z.string().trim().min(2, "Enter the student’s full name.").max(100),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(10, "Use at least 10 characters.").max(72),
  confirmPassword: z.string(),
}).refine(value => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "The passwords do not match.",
});
const existingStudentRegistration = z.object({
  token: z.string().refine(validClassRegistrationToken),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(8, "Enter your account password."),
});

export async function openClassRegistrationLink(
  _: ClassRegistrationState,
  formData: FormData,
): Promise<ClassRegistrationState> {
  const parsed = classAction.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "The group could not be identified. Refresh and try again." };
  await requireRole("teacher", "administrator");
  const origin = resolveAppOrigin({
    configuredOrigin: configuredAppOrigin(),
    requestOrigin: (await headers()).get("origin"),
  });
  if (!origin) return { message: "The public application address is not configured." };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();
  const { error } = await supabase.rpc("teacher_open_class_registration_link", {
    class_uuid: parsed.data.classId,
    token_hash_value: classRegistrationTokenHash(token),
    expires_at_value: expiresAt,
    max_registrations_value: 100,
  });
  if (error) {
    console.error("Class registration link could not be opened", { code: error.code });
    return { message: "The registration link could not be opened. Check that this group is ready for students." };
  }
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  return {
    ok: true,
    message: "Registration link opened. Share it with this group, then close it when everyone has joined.",
    url: `${origin}/join/${token}`,
  };
}

export async function closeClassRegistrationLink(
  _: ClassRegistrationState,
  formData: FormData,
): Promise<ClassRegistrationState> {
  const parsed = closeAction.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "The registration link could not be identified." };
  await requireRole("teacher", "administrator");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("teacher_close_class_registration_link", {
    link_uuid: parsed.data.linkId,
    class_uuid: parsed.data.classId,
  });
  if (error || data !== true) return { message: "This registration link was already closed or could not be changed." };
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  return { ok: true, message: "Registration link closed. No one else can use it." };
}

export async function registerWithClassLink(
  _: ClassRegistrationState,
  formData: FormData,
): Promise<ClassRegistrationState> {
  const parsed = studentRegistration.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const registration = await findOpenClassRegistration(parsed.data.token);
  if (!registration) return { message: "This registration link is closed, expired or full. Ask your teacher for a new link." };

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      display_name: parsed.data.name,
      requested_role: "student",
      class_registration_link_id: registration.linkId,
    },
  });
  if (createError || !created.user) {
    return { message: "An account already uses this email, or the account could not be created. Sign in if it is yours, or ask your teacher for help." };
  }

  const { error: enrolmentError } = await admin.rpc("consume_class_registration_link", {
    token_hash_value: classRegistrationTokenHash(parsed.data.token),
    student_uuid: created.user.id,
    email_value: parsed.data.email,
    display_name_value: parsed.data.name,
  });
  if (enrolmentError) {
    await admin.auth.admin.deleteUser(created.user.id);
    console.error("Class registration could not be consumed", { code: enrolmentError.code });
    return { message: "The link closed before registration finished. No account was kept. Ask your teacher to reopen it." };
  }

  const session = await createClient();
  const { error: signInError } = await session.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInError) redirect("/login?registration=complete");
  redirect("/dashboard");
}

export async function joinClassWithExistingAccount(
  _: ClassRegistrationState,
  formData: FormData,
): Promise<ClassRegistrationState> {
  const parsed = existingStudentRegistration.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const registration = await findOpenClassRegistration(parsed.data.token);
  if (!registration) return { message: "This registration link is closed, expired or full. Ask your teacher for a new link." };

  const session = await createClient();
  const { error: signInError } = await session.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInError) return { message: "The email or password was not recognised." };
  const { error: joinError } = await session.rpc("student_join_class_registration_link", {
    token_hash_value: classRegistrationTokenHash(parsed.data.token),
  });
  if (joinError) {
    await session.auth.signOut();
    return { message: "This account cannot join this group, or the link has closed. Ask your teacher for help." };
  }
  redirect("/dashboard");
}

"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { configuredAppOrigin, resolveAppOrigin } from "@/lib/app-origin";
import { finalizeCurrentStudentInvitation } from "@/lib/invitation-finalization";

export type AuthState = { message?: string; errors?: Record<string, string[]> };
const credentials = z.object({
  email: z.email("Enter a valid email address.").trim(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: "The email or password was not recognised." };
  const metadata = data.user.user_metadata as Record<string, unknown>;
  if (metadata.requested_role === "student" && metadata.invited_class_id) {
    const finalized = await finalizeCurrentStudentInvitation();
    if (finalized.kind !== "ready") {
      console.error("Student invitation login association failed", { outcome: finalized.kind, code: "code" in finalized ? finalized.code : undefined });
      await supabase.auth.signOut();
      return { message: "Your account is valid, but its class assignment could not be completed. Ask your teacher to retry the invitation." };
    }
  }
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.email().safeParse(formData.get("email"));
  if (!parsed.success) return { errors: { email: ["Enter a valid email address."] } };
  const origin = resolveAppOrigin({
    configuredOrigin: configuredAppOrigin(),
    requestOrigin: (await headers()).get("origin"),
  });
  if (!origin) return { message: "The public application URL is not configured, so no reset email was sent." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });
  if (error) {
    console.error("Password-reset email could not be sent", { code: error.code, status: error.status });
    return { message: "The email service could not send another reset link yet. Wait before retrying or ask an administrator for a secure account reset." };
  }
  // Deliberately do not disclose whether the account exists.
  return { message: "If that address belongs to an account, a reset link has been sent." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.string().min(10, "Use at least 10 characters.").safeParse(formData.get("password"));
  if (!parsed.success) return { errors: { password: [parsed.error.issues[0].message] } };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error || !data.user) return { message: "The reset session has expired. Request another link." };

  const metadata = data.user.user_metadata as Record<string, unknown>;
  if (metadata.requested_role === "student" && metadata.invited_class_id) {
    const finalized = await finalizeCurrentStudentInvitation();
    if (finalized.kind !== "ready") {
      console.error("Student invitation password association failed", {
        outcome: finalized.kind,
        code: "code" in finalized ? finalized.code : undefined,
      });
      await supabase.auth.signOut();
      return {
        message: "Your password was updated, but your group could not be connected yet. Sign in with your new password to retry, or ask your teacher to resend the invitation.",
      };
    }
  }
  redirect("/dashboard");
}

"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type AuthState = { message?: string; errors?: Record<string, string[]> };
const credentials = z.object({
  email: z.email("Enter a valid email address.").trim(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { message: "The email or password was not recognised." };
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
  const requestOrigin = (await headers()).get("origin");
  const origin = process.env.APP_URL?.replace(/\/$/, "") || requestOrigin;
  if (!origin) return { message: "The password-reset link could not be created from this address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });
  if (error) {
    console.error("Password-reset email could not be sent", { code: error.code, status: error.status });
    return { message: "The email service could not send another reset link yet. Wait before retrying or ask Hima for a secure account reset." };
  }
  // Deliberately do not disclose whether the account exists.
  return { message: "If that address belongs to an account, a reset link has been sent." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.string().min(10, "Use at least 10 characters.").safeParse(formData.get("password"));
  if (!parsed.success) return { errors: { password: [parsed.error.issues[0].message] } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { message: "The reset session has expired. Request another link." };
  return { message: "Password updated. You can now return to your dashboard." };
}

export async function confirmEmailToken(formData: FormData) {
  const parsed = z.object({
    tokenHash: z.string().min(20),
    type: z.enum(["recovery", "invite"]),
    next: z.string().startsWith("/").refine((value) => !value.startsWith("//")),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/login?error=invalid-email-link");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: parsed.data.type,
  });
  if (error) {
    console.error("Email token verification failed", { code: error.code, status: error.status });
    redirect("/login?error=expired-email-link");
  }
  redirect(parsed.data.next);
}

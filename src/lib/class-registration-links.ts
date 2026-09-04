import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const registrationTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function classRegistrationTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function validClassRegistrationToken(value: unknown): value is string {
  return typeof value === "string" && registrationTokenPattern.test(value);
}

export type ClassRegistrationSummary = {
  linkId: string;
  classId: string;
  className: string;
  courseTitle: string;
  expiresAt: string;
};

export async function findOpenClassRegistration(
  token: unknown,
): Promise<ClassRegistrationSummary | null> {
  if (!validClassRegistrationToken(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("class_registration_links")
    .select("id,class_id,expires_at,max_registrations,registration_count,revoked_at,classes!inner(id,name,published,archived_at,courses(title))")
    .eq("token_hash", classRegistrationTokenHash(token))
    .maybeSingle();
  const classData = related(data?.classes);
  if (!data || !classData || data.revoked_at || !classData.published || classData.archived_at
    || new Date(data.expires_at).getTime() <= Date.now()
    || Number(data.registration_count) >= Number(data.max_registrations)) return null;
  return {
    linkId: data.id,
    classId: data.class_id,
    className: String(classData.name),
    courseTitle: String(related(classData.courses)?.title ?? "SCCB course"),
    expiresAt: data.expires_at,
  };
}

function related<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

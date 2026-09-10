// Recoverable retirement of the two explicitly approved, labelled QA fixtures.
// Keeps all evidence; never deletes accounts or touches real learners.
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const classId = "2c5d1d26-d15d-4ccd-b7c0-44948c69552d";
const identities = [
  ["6f2947fd-9fce-4bee-98d8-47fc6e1a3a41", "teacher"],
  ["cb1ba067-e31b-48da-ab27-3963c72f9f81", "student"],
];
for (const [id, role] of identities) {
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || data.user?.app_metadata?.qa_run !== "mini-study-20260908" || data.user.email !== `mini-qa-${role}-20260908@example.invalid`) {
    throw new Error("QA identity guard failed; nothing retired");
  }
}
const group = await admin.from("classes").select("id,name").eq("id", classId).single();
if (group.error || group.data.name !== "QA ONLY Mini learning 20260908") throw new Error("QA group guard failed");
const members = await admin.from("enrolments").select("student_id").eq("class_id", classId);
if (members.error || members.data.some(row => row.student_id !== identities[1][0])) throw new Error("Non-QA membership; refusing retirement");
const archived_at = new Date().toISOString();
for (const [id] of identities) {
  const banned = await admin.auth.admin.updateUserById(id, { ban_duration: "8760h" });
  if (banned.error) throw banned.error;
  const profile = await admin.from("user_profiles").update({ archived_at }).eq("id", id).select("id").single();
  if (profile.error) throw profile.error;
}
const enrolment = await admin.from("enrolments").update({ archived_at }).eq("class_id", classId).eq("student_id", identities[1][0]);
if (enrolment.error) throw enrolment.error;
const archived = await admin.from("classes").update({ archived_at }).eq("id", classId).eq("name", "QA ONLY Mini learning 20260908").select("archived_at").single();
if (archived.error || !archived.data.archived_at) throw new Error("QA group retirement failed");
console.log("Retired exactly two labelled QA accounts and their isolated group. Evidence retained; archival and account bans are reversible.");

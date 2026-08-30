import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const hostedSeed = readFileSync(
  resolve(process.cwd(), "supabase", "seed_hosted_curriculum.sql"),
  "utf8",
);

const operationalTables = [
  "auth.users",
  "auth.identities",
  "public.user_profiles",
  "public.classes",
  "public.class_teachers",
  "public.class_units",
  "public.enrolments",
  "public.student_invitations",
  "public.attempts",
  "public.attempt_answers",
  "public.assessment_instances",
  "public.targets",
  "public.teacher_actions",
  "public.teacher_notes",
  "public.formative_response_reviews",
  "public.learner_curriculum_attempts",
  "public.learner_curriculum_progress",
  "public.learner_misconceptions",
  "public.learner_badges",
  "public.coin_transactions",
  "public.reward_purchases",
];

describe("hosted curriculum seed boundary", () => {
  it("contains reusable curriculum but no fabricated operational records", () => {
    expect(hostedSeed).toMatch(/insert\s+into\s+public\.courses\b/i);
    expect(hostedSeed).toMatch(/insert\s+into\s+public\.units\b/i);

    for (const table of operationalTables) {
      const escaped = table.replaceAll(".", "\\.");
      expect(hostedSeed, `${table} must remain empty in the hosted seed`).not.toMatch(
        new RegExp(`(?:insert\\s+into|update|delete\\s+from)\\s+${escaped}\\b`, "i"),
      );
    }
  });
});

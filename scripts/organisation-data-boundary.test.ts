import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = resolve(process.cwd(), "supabase", "migrations");
const migrations = readdirSync(migrationsDirectory)
  .filter(file => file.endsWith(".sql"))
  .sort()
  .map(file => readFileSync(resolve(migrationsDirectory, file), "utf8"))
  .join("\n");

function finalFunctionDefinition(name: string) {
  const matches = [...migrations.matchAll(
    new RegExp(
      `create(?: or replace)? function public\\.${name}\\b([\\s\\S]*?)\\$\\$;`,
      "gi",
    ),
  )];
  expect(matches.length, `${name} should be defined`).toBeGreaterThan(0);
  return matches.at(-1)?.[1] ?? "";
}

describe("organisation-scoped class and learner data boundaries", () => {
  it("keeps class management inside the actor's active organisation", () => {
    const body = finalFunctionDefinition("can_manage_class");
    expect(body).toMatch(/class\.organisation_id=actor\.organisation_id/i);
    expect(body).toMatch(/class\.archived_at is null/i);
    expect(body).toMatch(/actor\.archived_at is null/i);
    expect(body).toMatch(/actor\.role='administrator'/i);
    expect(body).toMatch(/actor\.role='teacher'/i);
    expect(body).toMatch(/class\.teacher_id=actor\.id/i);
    expect(body).toMatch(/class_teacher\.teacher_id=actor\.id/i);
    expect(body).toMatch(/class_teacher\.archived_at is null/i);
  });

  it("keeps class reads inside the actor's active organisation", () => {
    const body = finalFunctionDefinition("can_access_class");
    expect(body).toMatch(/class\.organisation_id=actor\.organisation_id/i);
    expect(body).toMatch(/class\.archived_at is null/i);
    expect(body).toMatch(/actor\.archived_at is null/i);
    expect(body).toMatch(/actor\.role='administrator'/i);
    expect(body).toMatch(/actor\.role='teacher'/i);
    expect(body).toMatch(/actor\.role='student'/i);
    expect(body).toMatch(/enrolment\.student_id=actor\.id/i);
    expect(body).toMatch(/enrolment\.archived_at is null/i);
  });

  it("allows administrators only within their organisation and teachers only through an active class", () => {
    const body = finalFunctionDefinition("can_access_learner");
    expect(body).toMatch(/actor\.organisation_id=learner\.organisation_id/i);
    expect(body).toMatch(/actor\.archived_at is null/i);
    expect(body).toMatch(/learner\.archived_at is null/i);
    expect(body).toMatch(/actor\.role='administrator'/i);
    expect(body).toMatch(/actor\.role='teacher'/i);
    expect(body).toMatch(/enrolment\.student_id=learner\.id/i);
    expect(body).toMatch(/enrolment\.archived_at is null/i);
    expect(body).toMatch(/class\.organisation_id=actor\.organisation_id/i);
    expect(body).toMatch(/class\.archived_at is null/i);
    expect(body).toMatch(/class\.teacher_id=actor\.id/i);
    expect(body).toMatch(/class_teacher\.teacher_id=actor\.id/i);
    expect(body).toMatch(/class_teacher\.archived_at is null/i);
  });
});

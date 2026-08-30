import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function migration(file: string) {
  return readFileSync(resolve(process.cwd(), "supabase", "migrations", file), "utf8");
}

describe("curriculum data access boundary", () => {
  it("limits student unit access to published active class assignments", () => {
    const access = migration("202607280005_course_starting_point_access.sql");
    expect(access).toMatch(/create or replace function public\.can_access_unit\(unit_uuid uuid\)/i);
    expect(access).toMatch(/e\.student_id=auth\.uid\(\)[\s\S]*e\.archived_at is null/i);
    expect(access).toMatch(/c\.archived_at is null and c\.published/i);
    expect(access).toMatch(/cu\.unit_id=unit_uuid and cu\.active and cu\.archived_at is null/i);
    expect(access).toMatch(/u\.id=unit_uuid and u\.code='1'/i);
  });

  it("applies assigned-unit access to approved lesson and activity rows", () => {
    const policies = migration("202607280001_complete_learning_progress_foundation.sql");
    expect(policies).toMatch(
      /create policy lessons_read[\s\S]*?public\.can_access_unit\(t\.unit_id\)[\s\S]*?status='approved'/i,
    );
    expect(policies).toMatch(
      /create policy activities_read[\s\S]*?public\.can_access_unit\(t\.unit_id\)[\s\S]*?status='approved'/i,
    );
  });
});

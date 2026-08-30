import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDirectory = resolve(process.cwd(), "supabase", "migrations");
const migrations = readdirSync(migrationsDirectory)
  .filter(file => file.endsWith(".sql"))
  .sort()
  .map(file => readFileSync(resolve(migrationsDirectory, file), "utf8"));
const statements = migrations.flatMap(contents => contents.split(";"));

describe("profile role data boundary", () => {
  it("never gives browser roles a profile insert, update or delete policy", () => {
    const profilePolicies = statements.filter(statement =>
      /create\s+policy/i.test(statement)
      && /on\s+public\.user_profiles\b/i.test(statement),
    );
    expect(profilePolicies.length).toBeGreaterThan(0);
    for (const policy of profilePolicies) {
      expect(policy).not.toMatch(/for\s+(?:insert|update|delete)\b/i);
    }
  });

  it("keeps role changes inside the administrator governance function", () => {
    const governance = readFileSync(
      resolve(migrationsDirectory, "202607280010_admin_curriculum_governance.sql"),
      "utf8",
    );
    expect(governance).toMatch(/where id=auth\.uid\(\) and role='administrator' and archived_at is null/i);
    expect(governance).toMatch(/where id=profile_uuid and organisation_id=actor\.organisation_id/i);
    expect(governance).toMatch(/profile_uuid=actor\.id and \(archived_value or role_value<>'administrator'\)/i);
    expect(governance).toMatch(/revoke all on function public\.admin_manage_profile\(uuid,text,boolean\) from public/i);
    expect(governance).toMatch(/grant execute on function public\.admin_manage_profile\(uuid,text,boolean\) to authenticated/i);
  });
});

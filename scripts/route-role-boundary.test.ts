import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), "src", "app", relativePath), "utf8");
}

describe("private page role boundaries", () => {
  it.each([
    ["admin/page.tsx", /requireRole\("administrator"\)/],
    ["teacher/content/page.tsx", /requireRole\("administrator"\)/],
    ["teacher/sample-report/page.tsx", /requireRole\("teacher",\s*"administrator"\)/],
    ["teacher/classes/[id]/page.tsx", /requireRole\("teacher",\s*"administrator"\)/],
    ["teacher/learners/[id]/page.tsx", /requireRole\("teacher",\s*"administrator"\)/],
    ["teacher/learners/[id]/evidence/page.tsx", /requireRole\("teacher",\s*"administrator"\)/],
    ["learn/[lessonId]/page.tsx", /requireRole\("student",\s*"teacher",\s*"administrator"\)/],
    ["learn/[lessonId]/activities/[activityId]/page.tsx", /requireRole\("student",\s*"teacher",\s*"administrator"\)/],
    ["progress/page.tsx", /requireRole\("student"\)/],
    ["portfolio/page.tsx", /requireRole\("student"\)/],
    ["rewards/page.tsx", /requireRole\("student"\)/],
  ])("keeps %s behind its explicit role guard", (relativePath, guard) => {
    expect(source(relativePath)).toMatch(guard);
  });

  it("requires an authenticated profile before rendering a dashboard", () => {
    const dashboard = source("dashboard/page.tsx");
    expect(dashboard).toMatch(/await getSessionProfile\(\)/);
    expect(dashboard).toMatch(/if \(!profile\) redirect\("\/login"\)/);
  });

  it.each([
    "learn/network-security/page.tsx",
    "curriculum/units/[unitCode]/page.tsx",
    "curriculum/units/[unitCode]/starting-point/page.tsx",
    "curriculum/units/[unitCode]/papers/page.tsx",
    "curriculum/units/[unitCode]/project/page.tsx",
    "curriculum/units/[unitCode]/topics/[topicCode]/page.tsx",
    "curriculum/units/[unitCode]/topics/[topicCode]/practice/page.tsx",
  ])("checks assigned-unit access in %s", (relativePath) => {
    expect(source(relativePath)).toMatch(/requireCurriculumUnitAccess\(/);
  });

  it("keeps audit internals out of the visible administration interface", () => {
    const adminPage = source("admin/page.tsx");
    const adminSettings = readFileSync(
      resolve(process.cwd(), "src", "components", "admin-settings-form.tsx"),
      "utf8",
    );

    expect(adminPage).not.toMatch(/audit log/i);
    expect(adminSettings).not.toContain("Audit log years");
    expect(adminSettings).not.toContain("auditLogYears");
  });
});

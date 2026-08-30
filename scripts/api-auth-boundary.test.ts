import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), "src", "app", relativePath), "utf8");
}

describe("API and authentication boundaries", () => {
  it.each([
    "api/reports/classes/[id]/route.ts",
    "api/reports/classes/[id]/units/[unitId]/route.ts",
    "api/reports/learners/[id]/route.ts",
  ])("requires authenticated staff evidence access in %s", (relativePath) => {
    const route = source(relativePath);
    expect(route).toMatch(/await getSessionProfile\(\)/);
    expect(route).toMatch(/if \(!actor\).*401/);
    expect(route).toMatch(/canViewLearnerEvidence\(actor\.role\)/);
    expect(route).toMatch(/Not authorised\.[^\n]*403/);
  });

  it.each([
    "api/course-entry-readiness/eligibility/route.ts",
    "api/course-entry-readiness/start/route.ts",
    "api/course-entry-readiness/submit/route.ts",
  ])("keeps the public readiness calculation stateless in %s", (relativePath) => {
    const route = source(relativePath);
    expect(route).not.toMatch(/@\/lib\/supabase/);
    expect(route).not.toMatch(/\.from\s*\(/);
    expect(route).not.toMatch(/\.rpc\s*\(/);
  });

  it("keeps authentication callback redirects internal and finalises invited students", () => {
    const callback = source("auth/callback/route.ts");
    expect(callback).toMatch(/safeInternalPath\(url\.searchParams\.get\("next"\)\)/);
    expect(callback).toMatch(/finalizeCurrentStudentInvitation\(/);
    expect(callback).toMatch(/await supabase\.auth\.signOut\(\)/);
  });

  it("validates email-link destinations and finalises before redirecting", () => {
    const verification = source("auth/verify/route.ts");
    expect(verification).toMatch(/startsWith\("\/"\)/);
    expect(verification).toMatch(/!value\.startsWith\("\/\/"\)/);
    expect(verification).toMatch(/finalizeCurrentStudentInvitation\(/);
    expect(verification).toMatch(/publicAuthRedirect\(request\.url, parsed\.data\.next\)/);
  });
});

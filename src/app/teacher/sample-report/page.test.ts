import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireRole, redirect } = vi.hoisted(() => ({
  requireRole: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireRole }));
vi.mock("next/navigation", () => ({ redirect }));

import SampleReportPage from "./page";

describe("retired sample report route", () => {
  beforeEach(() => {
    requireRole.mockReset();
    redirect.mockReset();
    requireRole.mockResolvedValue({ role: "teacher" });
  });

  it("authorises teaching staff and returns them to their real groups", async () => {
    await SampleReportPage();

    expect(requireRole).toHaveBeenCalledWith("teacher", "administrator");
    expect(redirect).toHaveBeenCalledWith("/dashboard#groups");
  });
});

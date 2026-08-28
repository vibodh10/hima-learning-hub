import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { saveDatabaseActivityPosition } from "@/app/actions/learning";
import { ActivityPositionTracker } from "./activity-position-tracker";

vi.mock("@/app/actions/learning", () => ({
  saveDatabaseActivityPosition: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("ActivityPositionTracker", () => {
  afterEach(() => {
    cleanup();
    vi.mocked(saveDatabaseActivityPosition).mockClear();
  });

  it("persists the exact lesson and activity opened by the learner", async () => {
    render(<ActivityPositionTracker lessonId="lesson-a" activityId="activity-b"/>);

    await waitFor(() => {
      expect(saveDatabaseActivityPosition).toHaveBeenCalledWith("lesson-a", "activity-b");
    });
  });
});

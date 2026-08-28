import { describe, expect, it } from "vitest";
import {
  latestSavedLearningResume,
  selectDatabaseActivityContinuation,
} from "./database-learning-continuation";

const activities = [
  { id: "guided", title: "Guided practice" },
  { id: "core", title: "Core practice" },
  { id: "mastery", title: "Mastery check" },
];

describe("selectDatabaseActivityContinuation", () => {
  it("resumes the exact saved activity when it is still actionable", () => {
    expect(selectDatabaseActivityContinuation({
      savedActivityId: "core",
      activities,
      states: [
        state("guided", 4, "Completed"),
        state("core", 5, "In Progress"),
        state("mastery", 7, "Locked"),
      ],
    })).toMatchObject({ activityId: "core", state: "In Progress" });
  });

  it("moves to the next available activity after the saved one is completed", () => {
    expect(selectDatabaseActivityContinuation({
      savedActivityId: "guided",
      activities,
      states: [
        state("guided", 4, "Completed"),
        state("core", 5, "Available"),
        state("mastery", 7, "Locked"),
      ],
    })).toMatchObject({ activityId: "core", activityTitle: "Core practice", state: "Available" });
  });

  it("prioritises required additional practice over moving ahead", () => {
    expect(selectDatabaseActivityContinuation({
      savedActivityId: "guided",
      activities,
      states: [
        state("guided", 4, "Completed"),
        state("core", 5, "Additional Practice Required"),
        state("mastery", 7, "Available"),
      ],
    })).toMatchObject({ activityId: "core", state: "Additional Practice Required" });
  });

  it("returns no continuation when every remaining activity is completed, locked or scheduled", () => {
    expect(selectDatabaseActivityContinuation({
      savedActivityId: "core",
      activities,
      states: [
        state("guided", 4, "Completed"),
        state("core", 5, "Completed"),
        state("mastery", 7, "Scheduled"),
      ],
    })).toBeNull();
  });
});

describe("latestSavedLearningResume", () => {
  it("uses the most recently persisted module or database activity position", () => {
    const moduleResume = resume("module", "2026-08-27T09:00:00Z");
    const activityResume = resume("activity", "2026-08-27T10:00:00Z");
    expect(latestSavedLearningResume(moduleResume, activityResume)?.title).toBe("activity");
    expect(latestSavedLearningResume(activityResume, moduleResume)?.title).toBe("activity");
  });

  it("keeps a valid saved position when the other timestamp is invalid", () => {
    expect(latestSavedLearningResume(
      resume("module", "2026-08-27T09:00:00Z"),
      resume("invalid", "not-a-date"),
    )?.title).toBe("module");
  });
});

function state(activity_id: string, sequence_order: number, value: string) {
  return {
    activity_id,
    sequence_order,
    state: value,
    status_detail: value,
  };
}

function resume(title: string, updatedAt: string) {
  return { title, detail: title, href: `/${title}`, updatedAt };
}

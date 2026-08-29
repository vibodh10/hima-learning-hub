import { describe, expect, it } from "vitest";
import { configuredUnits } from "./learning-catalog";
import { curriculumPositionSection } from "./curriculum-position";

const unit = configuredUnits.find(item => item.code === "4")!;
const topic = unit.topics[0];

describe("curriculumPositionSection", () => {
  it.each(["teaching", "practice", "mastery", "retrieval"])("accepts the named %s position", section => {
    expect(curriculumPositionSection(unit, topic, section, "Core")).toBe(section);
  });

  it("accepts only lesson cards that exist for the server-stored level", () => {
    expect(curriculumPositionSection(unit, topic, "lesson:1", "Core")).toBe("lesson:1");
    expect(curriculumPositionSection(unit, topic, "lesson:999", "Core")).toBeNull();
  });

  it.each(["", "lesson:0", "lesson:-1", "lesson:1.5", "paper", "../mastery"])("rejects %s", section => {
    expect(curriculumPositionSection(unit, topic, section, "Challenge")).toBeNull();
  });

  it("falls back to the Core sequence when a stored level is invalid", () => {
    expect(curriculumPositionSection(unit, topic, "lesson:1", "forged")).toBe("lesson:1");
  });
});

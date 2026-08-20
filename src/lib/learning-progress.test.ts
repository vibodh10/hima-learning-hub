import { describe, expect, it } from "vitest";
import { progressKey, progressKeyFor } from "./learning-progress";

describe("learner progress storage isolation", () => {
  it("uses a different browser-storage key for every learner", () => {
    const first = progressKeyFor("learner-a");
    const second = progressKeyFor("learner-b");

    expect(first).toBe(`${progressKey}:learner-a`);
    expect(second).toBe(`${progressKey}:learner-b`);
    expect(first).not.toBe(second);
  });
});

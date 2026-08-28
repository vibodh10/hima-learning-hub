import { describe, expect, it } from "vitest";
import { selectStudentNextAction } from "./student-next-action";

const now = new Date("2026-08-27T12:00:00Z").getTime();
const journey = { title: "Variables and data types", detail: "Continue the current topic.", href: "/unit/4/variables" };

describe("selectStudentNextAction", () => {
  it("puts an incomplete starting point before ordinary learning", () => {
    const action = selectStudentNextAction({
      startingPoint: { title: "Course starting point", detail: "Create the baseline.", href: "/starting-point" },
      catchUps: [], allocations: [], journey, now,
    });
    expect(action).toMatchObject({ kind: "starting_point", href: "/starting-point" });
  });

  it("puts genuine catch-up before allocations and the weekly journey", () => {
    const action = selectStudentNextAction({
      catchUps: [{ title: "Selection catch-up", href: "/selection", status: "reminded" }],
      allocations: [{ title: "Homework", href: "/homework", completed: false, deadlineAt: "2026-08-26T12:00:00Z" }],
      journey, now,
    });
    expect(action).toMatchObject({ kind: "catch_up", href: "/selection" });
  });

  it("selects the earliest outstanding allocation and labels overdue work", () => {
    const action = selectStudentNextAction({
      catchUps: [],
      allocations: [
        { title: "Later work", href: "/later", completed: false, deadlineAt: "2026-09-01T12:00:00Z" },
        { title: "Finished work", href: "/finished", completed: true, deadlineAt: "2026-08-20T12:00:00Z" },
        { title: "Overdue work", href: "/overdue", completed: false, deadlineAt: "2026-08-26T12:00:00Z" },
      ],
      journey, now,
    });
    expect(action).toMatchObject({ kind: "allocation", href: "/overdue", meta: "Overdue 26/08/2026" });
  });

  it("uses the current journey before a generic target or lesson", () => {
    const action = selectStudentNextAction({
      catchUps: [], allocations: [], journey,
      target: { title: "Target", detail: "Practise this skill.", href: "/target" },
      lesson: { title: "Pilot", detail: "Generic lesson.", href: "/pilot" },
      now,
    });
    expect(action).toMatchObject({ kind: "journey", href: "/unit/4/variables" });
  });

  it("keeps a saved module behind the class teaching journey", () => {
    const action = selectStudentNextAction({
      catchUps: [], allocations: [],
      resume: { title: "Continue Module 2", detail: "Resume lesson card 3.", href: "/module-2" },
      journey,
      now,
    });
    expect(action).toMatchObject({ kind: "journey", href: "/unit/4/variables" });
  });

  it("resumes a saved module when there is no active class journey", () => {
    const action = selectStudentNextAction({
      catchUps: [], allocations: [],
      resume: { title: "Continue Module 2", detail: "Resume lesson card 3.", href: "/module-2" },
      now,
    });
    expect(action).toMatchObject({ kind: "resume", href: "/module-2", meta: "Saved position" });
  });

  it("returns no action when no stored or assigned learning is available", () => {
    expect(selectStudentNextAction({ catchUps: [], allocations: [], now })).toBeNull();
  });
});

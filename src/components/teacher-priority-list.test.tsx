import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeacherPriorityList } from "./teacher-priority-list";

describe("teacher priority list", () => {
  it("shows only evidence states that require teacher action", () => {
    render(<TeacherPriorityList items={[
      { classId: "group-1", className: "Group 1", learnerId: "learner-1", learnerName: "Asha", status: "action_required", reason: "Two required activities are overdue." },
      { classId: "group-1", className: "Group 1", learnerId: "learner-2", learnerName: "Ben", status: "on_track", reason: "Recorded evidence is on track." },
    ]}/>);

    expect(screen.getByRole("link", { name: /Asha.*Group 1.*Action required/i }))
      .toHaveAttribute("href", "/teacher/learners/learner-1?classId=group-1");
    expect(screen.queryByText("Ben")).not.toBeInTheDocument();
  });

  it("uses an explicit empty state instead of inventing an alert", () => {
    render(<TeacherPriorityList items={[]}/>);
    expect(screen.getByText("No student currently has recorded evidence requiring teacher action.")).toBeVisible();
  });
});

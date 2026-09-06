import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { TeacherLearnerSummary } from "./teacher-learner-summary";

afterEach(cleanup);

describe("teacher learner summary", () => {
  it("keeps the teacher page focused on one action and hides secondary reports", async () => {
    const user=userEvent.setup();
    render(<TeacherLearnerSummary
      attentionReason="Teaching Week 2 required work is incomplete."
      attentionStatus="action_required"
      classChoices={[{ id: "class-1", name: "Group A" }]}
      courseTitle="Level 3 Computing"
      currentWeek={3}
      groupHref="/teacher/classes/class-1"
      groupName="Group A"
      latestTest="62% on 04/09/2026"
      learnerHref="/api/reports/learners/learner-1?classId=class-1"
      learnerId="learner-1"
      learnerName="Student One"
      quarterlyPeriod={{ from: "2026-07-01", to: "2026-09-30" }}
      startingPoint="45% Support"
      targetSummary="1 active"
      unitTitle="Unit 6: Website Development"
      weeklyPeriod={{ from: "2026-08-31", to: "2026-09-06" }}
    />);

    expect(screen.getByRole("heading", { name: "This student needs help" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Weekly report" })).toHaveAttribute(
      "href",
      "/api/reports/learners/learner-1?classId=class-1&from=2026-08-31&to=2026-09-06",
    );
    expect(screen.getByRole("link", { name: "Open this week's evidence →" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Quarterly report" })).not.toBeVisible();
    await user.click(screen.getByText("Download another report"));
    expect(screen.getByRole("link", { name: "Quarterly report" })).toBeVisible();
    expect(screen.queryByText("Teacher tools")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
});

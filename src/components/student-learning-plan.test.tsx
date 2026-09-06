import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { StudentLearningPlan } from "./student-learning-plan";

afterEach(cleanup);

describe("student learning plan", () => {
  it("keeps the detailed journey hidden until the student opens it", async () => {
    const user=userEvent.setup();
    render(<StudentLearningPlan
      unitTitle="Unit 6: Website Development"
      teachingWeek={3}
      totalTeachingWeeks={12}
      status="active"
      currentTopic={{ code: "B1", title: "HTML structure", milestone: "Learning", focus: "Build a semantic page." }}
      details={<p>Evidence details</p>}
    />);

    expect(screen.getByRole("heading", { name: "Unit 6: Website Development" })).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "25% of the teaching journey reached" })).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByText("Now: B1")).not.toBeVisible();
    await user.click(screen.getByText(/Open my course plan and dates/));
    expect(screen.getByText("Now: B1")).toBeVisible();
    expect(screen.getByText("Use the main Continue button above. The portal keeps your place automatically.")).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("explains a college-break pause inside the optional detail", async () => {
    const user=userEvent.setup();
    render(<StudentLearningPlan
      unitTitle="Unit 6: Website Development"
      teachingWeek={4}
      totalTeachingWeeks={12}
      status="paused"
      pauseMessage="Half term does not use a teaching week. Your journey resumes on 2 November 2026."
      details={null}
    />);

    expect(screen.getByText("Paused for college break")).toBeVisible();
    await user.click(screen.getByText(/Open my course plan and dates/));
    expect(screen.getByText(/Half term does not use a teaching week/)).toBeVisible();
  });

  it("keeps progress valid while a journey total is unavailable", () => {
    render(<StudentLearningPlan
      unitTitle="Unit setup in progress"
      teachingWeek={0}
      totalTeachingWeeks={0}
      status="active"
      details={null}
    />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeacherGroupCard } from "./teacher-group-card";

const base = {
  id: "group-1",
  name: "Q0002098 · DG Diploma Y2 · Tue/Fri",
  studentCount: 0,
  schedule: "Tuesday / Friday",
  unitTitles: ["programming"],
};

describe("teacher group card", () => {
  it("makes a student-ready group obvious", () => {
    render(<TeacherGroupCard {...base} invitationReady/>);

    expect(screen.getByText("Ready for students")).toBeVisible();
    expect(screen.getByText("Tuesday / Friday · Programming")).toBeVisible();
    expect(screen.getByRole("link", { name: /Q0002098.*Open group/i }))
      .toHaveAttribute("href", "/teacher/classes/group-1");
    expect(screen.queryByText(/cannot join/i)).not.toBeInTheDocument();
  });

  it("explains that students cannot join an incomplete group", () => {
    render(<TeacherGroupCard {...base} invitationReady={false}/>);

    expect(screen.getByText("Setup in progress")).toBeVisible();
    expect(screen.getByText("Students cannot join until an administrator completes this group."))
      .toBeVisible();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudentEnrolmentSummary } from "./student-enrolment-summary";

describe("StudentEnrolmentSummary", () => {
  it("shows the assigned group before directing the learner to the next step", () => {
    render(<StudentEnrolmentSummary
      groupName="Q5064225 · DG Diploma Y1 · Mon/Tue"
      courseTitle="Pearson BTEC Level 3 National Information Technology"
    />);

    expect(screen.getByRole("region", { name: "Current enrolment" })).toHaveTextContent(
      "You are enrolled in Q5064225 · DG Diploma Y1 · Mon/Tue",
    );
    expect(screen.getByText(/starting point or next required learning step/i)).toBeInTheDocument();
  });
});

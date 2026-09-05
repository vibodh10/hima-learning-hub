import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeacherSecondaryPanel } from "./teacher-secondary-panel";

describe("TeacherSecondaryPanel", () => {
  it("keeps optional evidence and controls collapsed by default", () => {
    render(<TeacherSecondaryPanel><p>Optional control</p></TeacherSecondaryPanel>);

    expect(screen.getByText("View detailed evidence and optional tools")).toBeVisible();
    expect(screen.getByTestId("teacher-secondary-panel")).not.toHaveAttribute("open");
    expect(screen.getByText(/downloadable reports above are enough/i)).toBeInTheDocument();
  });
});

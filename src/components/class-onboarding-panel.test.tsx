import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClassOnboardingPanel } from "./class-onboarding-panel";

describe("ClassOnboardingPanel", () => {
  it("keeps first-student onboarding visible for an empty group", () => {
    render(<ClassOnboardingPanel studentCount={0} awaitingCount={0}><p>Send a secure invitation</p></ClassOnboardingPanel>);

    expect(screen.queryByTestId("class-onboarding-panel")).not.toBeInTheDocument();
    expect(screen.getByText("Send a secure invitation")).toBeVisible();
  });

  it("collapses repeat onboarding after a group has students", () => {
    render(<ClassOnboardingPanel studentCount={3} awaitingCount={2}><p>Invitation records</p></ClassOnboardingPanel>);

    const panel = screen.getByTestId("class-onboarding-panel");
    expect(panel).not.toHaveAttribute("open");
    expect(screen.getByText("Add more students and manage access")).toBeInTheDocument();
    expect(screen.getByText("2 awaiting response")).toBeInTheDocument();
  });
});

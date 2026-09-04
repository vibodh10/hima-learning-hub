import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/class-registration", () => ({
  openClassRegistrationLink: vi.fn(),
  closeClassRegistrationLink: vi.fn(),
}));

import { ClassRegistrationLinkPanel } from "./class-registration-link-panel";

describe("ClassRegistrationLinkPanel", () => {
  it("makes link-based registration the clear first action", () => {
    render(<ClassRegistrationLinkPanel classId="class-1" activeLink={null}/>);
    expect(screen.getByRole("heading", { name: "Share one group registration link" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Create registration link" })).toBeVisible();
    expect(screen.getByText(/close it as soon as everyone has registered/i)).toBeVisible();
  });

  it("shows an immediate close control for an open link", () => {
    render(<ClassRegistrationLinkPanel classId="class-1" activeLink={{
      id:"link-1",expiresAt:"2026-09-11T12:00:00Z",registrationCount:12,maxRegistrations:100,
    }}/>);
    expect(screen.getByText("Registration is open")).toBeVisible();
    expect(screen.getByText(/12 registered through this link/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Close registration link" })).toBeVisible();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/class-registration", () => ({
  registerWithClassLink: vi.fn(),
  joinClassWithExistingAccount: vi.fn(),
}));

import { ClassLinkRegistrationForm } from "./class-link-registration-form";

describe("ClassLinkRegistrationForm", () => {
  it("collects only the details needed to create the student account", () => {
    render(<ClassLinkRegistrationForm token="registration-token"/>);
    expect(screen.getByLabelText("Full name")).toBeVisible();
    expect(screen.getByLabelText("Email address")).toBeVisible();
    expect(screen.getByLabelText("Create a password")).toBeVisible();
    expect(screen.getByRole("button", { name: "Register and join this group" })).toBeVisible();
    expect(screen.getByText("I already have a student account")).toBeVisible();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestedTeacherNames } from "@/lib/requested-teachers";
import { TeacherAccountSetupForm } from "./teacher-account-setup-form";

vi.mock("@/app/actions/staff-accounts", () => ({ setupTeacherAccount: vi.fn() }));

describe("secure teacher account setup", () => {
  afterEach(cleanup);

  it("offers every requested tutor and requires a verified email", () => {
    render(<TeacherAccountSetupForm/>);
    for (const name of requestedTeacherNames) expect(screen.getByRole("option", { name })).toBeInTheDocument();
    expect(screen.getByLabelText("Verified college email")).toHaveAttribute("type", "email");
    expect(screen.getByRole("button", { name: "Create or resend" })).toBeInTheDocument();
    expect(screen.getByText(/creates no shared or visible password/i)).toBeInTheDocument();
  });

  it("shows which requested tutors already have access and their login email", () => {
    render(<TeacherAccountSetupForm existingAccounts={[{name:"Robert Thacker",email:"robert@example.ac.uk"}]}/>);
    expect(screen.getByText("robert@example.ac.uk")).toBeInTheDocument();
    expect(screen.getByText("Access active")).toBeInTheDocument();
    expect(screen.getAllByText("Login needed")).toHaveLength(5);
  });
});

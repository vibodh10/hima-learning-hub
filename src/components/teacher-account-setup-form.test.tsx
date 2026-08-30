import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestedTeacherNames } from "@/lib/requested-teachers";
import { TeacherAccountSetupForm } from "./teacher-account-setup-form";

vi.mock("@/app/actions/staff-accounts", () => ({ setupTeacherAccount: vi.fn() }));

describe("secure teacher account setup", () => {
  afterEach(cleanup);

  it("offers every requested tutor and requires a verified email", () => {
    render(<TeacherAccountSetupForm/>);
    expect(requestedTeacherNames).toContain("Himabindu Gunde");
    for (const name of requestedTeacherNames) expect(screen.getByRole("option", { name })).toBeInTheDocument();
    expect(screen.getByLabelText("Verified college email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Verified college email")).toHaveAttribute("placeholder", "name@sccb.ac.uk");
    expect(screen.getByRole("button", { name: "Create or resend" })).toBeInTheDocument();
    expect(screen.getByText(/creates no shared or visible password/i)).toBeInTheDocument();
  });

  it("shows which requested tutors already have access and their login email", () => {
    render(<TeacherAccountSetupForm existingAccounts={[{name:"Robert Thacker",email:"robert@example.ac.uk"}]}/>);
    expect(screen.getByText("robert@example.ac.uk")).toBeInTheDocument();
    expect(screen.getByText("Access active")).toBeInTheDocument();
    expect(screen.getAllByText("Login needed")).toHaveLength(requestedTeacherNames.length-1);
  });

  it("does not present a teacher profile without an Auth login as active", () => {
    render(<TeacherAccountSetupForm existingAccounts={[{
      name:"Himabindu Gunde",
      email:null,
      status:"incomplete",
    }]}/>);
    expect(screen.getByText("Login needs repair")).toBeInTheDocument();
    expect(screen.getByText(/secure login is missing/i)).toBeInTheDocument();
  });
});

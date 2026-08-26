import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoleBanner } from "./role-banner";

describe("role banner", () => {
  afterEach(cleanup);

  it.each([
    ["student", "Student mode", /course, assessments, progress and next actions/i],
    ["teacher", "Teacher mode", /classes, students, assessment evidence/i],
    ["administrator", "Administrator mode", /curriculum, user and governance controls/i],
  ] as const)("makes %s mode explicit", (role, label, description) => {
    render(<RoleBanner role={role} />);
    expect(screen.getByLabelText(label)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileManagementForm } from "./admin-governance-forms";

vi.mock("@/app/actions/learning", () => ({
  manageProfile: vi.fn(),
  requestLearnerDataDeletion: vi.fn(),
  executeLearnerDataDeletion: vi.fn(),
  createAcademicYear: vi.fn(),
  createCurriculumVersion: vi.fn(),
  setAcademicYearStatus: vi.fn(),
  setCourseStatus: vi.fn(),
  setCurriculumVersionStatus: vi.fn(),
}));

describe("administrator learner deletion", () => {
  it("renders user editing and learner deletion as separate forms", () => {
    const { container } = render(<ProfileManagementForm profile={{
      id: "00000000-0000-0000-0000-000000000001",
      display_name: "Test learner",
      role: "student",
      archived_at: null,
    }}/>);

    const forms = [...container.querySelectorAll("form")];
    expect(forms).toHaveLength(2);
    expect(forms.every(form => form.querySelector("form") === null)).toBe(true);
  });
});

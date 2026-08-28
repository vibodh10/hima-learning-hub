import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { recordTeacherNote } from "@/app/actions/learning";
import { TeacherNoteForm } from "./learner-teacher-controls";

vi.mock("@/app/actions/learning", () => ({
  recordTeacherNote: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("@/app/actions/curriculum", () => ({
  recordWorkbookTeacherDecision: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("TeacherNoteForm", () => {
  afterEach(() => {
    cleanup();
    vi.mocked(recordTeacherNote).mockClear();
  });

  it("binds a private note to the selected learner and class", () => {
    render(<TeacherNoteForm learnerId="learner-1" classId="class-1"/>);

    expect(screen.getByRole("textbox", { name: "Private class note" })).toHaveAttribute("maxlength", "2000");
    expect(screen.getByDisplayValue("learner-1")).toHaveAttribute("name", "learnerId");
    expect(screen.getByDisplayValue("class-1")).toHaveAttribute("name", "classId");
    expect(screen.getByRole("button", { name: "Record class note" })).toBeVisible();
    expect(screen.getByText(/selected class is recorded automatically/i)).toBeVisible();
  });
});

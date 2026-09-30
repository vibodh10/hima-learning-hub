import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {Unit6AssignmentWorkshop} from "./unit6-assignment-workshop";
import {workshopSteps, assignmentWebsites} from "@/lib/unit6-assignment-workshop";

afterEach(cleanup);
function choose(id: string) {
  fireEvent.change(screen.getByLabelText("Open an assignment step"), {target: {value: String(workshopSteps.findIndex(step => step.id === id))}});
}
describe("Unit 6 assignment workshop", () => {
  it("starts at the beginning and keeps every section available without a date gate", () => {
    render(<Unit6AssignmentWorkshop preview/>);
    expect(screen.getByRole("heading", {level: 1})).toHaveTextContent("Start here");
    expect(screen.getAllByRole("option")).toHaveLength(workshopSteps.length);
    choose("review");
    expect(screen.getByRole("heading", {level: 1})).toHaveFocus();
    expect(screen.getByRole("link", {name: "Back to learning"})).toHaveAttribute("href", "/study/preview");
    expect(screen.getByText(/supplied brief leaves the deadline blank/)).toBeInTheDocument();
    expect(screen.queryByText(/28 September/)).not.toBeInTheDocument();
  });
  it("keeps checks per step, does not gate navigation, and resets expanded help", () => {
    render(<Unit6AssignmentWorkshop/>);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Show an example or extra help"));
    fireEvent.click(screen.getByRole("button", {name: "Next step"}));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText("Show an example or extra help").closest("details")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByRole("button", {name: "Previous step"}));
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByText(/Ticks last for this visit only/)).toBeInTheDocument();
  });
  it("uses all seven approved sites and explains replacing template links", () => {
    render(<Unit6AssignmentWorkshop/>);
    choose("websites");
    fireEvent.click(screen.getByText("Open the seven approved website choices"));
    for (const site of assignmentWebsites) {
      expect(screen.getByRole("link", {name: `${site.title} (opens in a new tab)`})).toHaveAttribute("href", site.url);
    }
    choose("template-links");
    expect(screen.getByRole("heading", {level: 1})).toHaveTextContent("Replace the template links");
    expect(screen.getByText(/Move each source link you actually used into References/)).toBeInTheDocument();
  });
});

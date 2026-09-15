import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,describe,expect,it} from "vitest";
import {AssignmentOneGuide} from "./assignment-one-guide";
import {assignmentSchedule,assignmentSteps} from "@/lib/assignment-one";
import {programmingSteps} from "@/lib/programming-assignment-one";

afterEach(cleanup);
const schedule=assignmentSchedule(new Date("2026-09-15T10:00:00Z"));
describe("Assignment 1 preparation",()=>{
  it("shows the Unit 4 theory guide and the correct final checkpoint",()=>{
    const due=assignmentSchedule(new Date("2026-09-28T10:00:00Z"),programmingSteps);
    render(<AssignmentOneGuide unit="4" schedule={due}/>);
    expect(screen.getByRole("heading",{level:1})).toHaveTextContent("Submit through your teacher's chosen route");
    expect(screen.getByText(/Unit 4 Programming/)).toBeInTheDocument();
    expect(screen.getByText(/A.P3: explain/)).toBeInTheDocument();
    expect(screen.getByRole("link",{name:"Download a blank evidence sheet"})).toHaveAttribute("href","/programming-assignment-one-evidence-template.txt");
    fireEvent.change(screen.getByLabelText("Open a preparation step"),{target:{value:"0"}});
    expect(screen.getByRole("heading",{level:1})).toHaveTextContent("Start with your theory assignment");
    expect(screen.queryByText("Choose your two websites")).not.toBeInTheDocument();
  });
  it("keeps every step accessible ahead of time without claiming completion",()=>{
    render(<AssignmentOneGuide schedule={schedule} preview/>);
    expect(screen.getByRole("heading",{level:1})).toHaveTextContent("Choose your two websites");
    fireEvent.click(screen.getByText("See the plan or choose a step"));
    fireEvent.change(screen.getByLabelText("Open a preparation step"),{target:{value:"9"}});
    expect(screen.getByRole("heading",{level:1})).toHaveTextContent("Submit through your teacher's chosen route");
    expect(screen.getByRole("heading",{level:1})).toHaveFocus();
    expect(screen.getByText(/Reading this guide does not save assignment progress/)).toBeInTheDocument();
    expect(screen.getByRole("link",{name:"Back to learning"})).toHaveAttribute("href","/study/preview");
    fireEvent.click(screen.getByRole("button",{name:"Go to the current checkpoint"}));
    expect(screen.getByRole("heading",{level:1})).toHaveTextContent("Choose your two websites");
  });
  it("gives corrective feedback and clears answers when the learner changes steps",()=>{
    render(<AssignmentOneGuide schedule={schedule}/>);
    fireEvent.click(screen.getByText("Try a quick practice check"));
    expect(screen.getByRole("button",{name:"Check my understanding"})).toBeDisabled();
    fireEvent.click(screen.getByRole("radio",{name:assignmentSteps[0].check.options[0]}));
    fireEvent.click(screen.getByRole("button",{name:"Check my understanding"}));
    expect(screen.getByRole("status")).toHaveTextContent("Let's look again");
    fireEvent.click(screen.getByRole("radio",{name:assignmentSteps[0].check.options[1]}));
    fireEvent.click(screen.getByRole("button",{name:"Check my understanding"}));
    expect(screen.getByRole("status")).toHaveTextContent("That's right");
    fireEvent.click(screen.getByRole("button",{name:"Next step"}));
    fireEvent.click(screen.getByText("Try a quick practice check"));
    expect(screen.getByRole("button",{name:"Check my understanding"})).toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("uses the real Diploma publication year without fabricating an access date",()=>{
    render(<AssignmentOneGuide schedule={{...schedule,current:7}}/>);
    expect(screen.getByText("(Pearson, 2020)")).toBeInTheDocument();
    expect(screen.getByText(/the date you opened the document/)).toBeInTheDocument();
    expect(screen.getByText(/Pearson's Unit 6 specification does not prescribe/)).toBeInTheDocument();
  });
  it("does not invent a deadline time or declare a late learner failed",()=>{
    render(<AssignmentOneGuide schedule={assignmentSchedule(new Date("2026-09-29T09:00:00Z"))}/>);
    expect(screen.getByText(/planned date has passed/)).toHaveTextContent("agreed extension");
    expect(screen.queryByText(/failed|23:59|midnight deadline/i)).not.toBeInTheDocument();
  });
});

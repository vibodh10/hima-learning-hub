import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClassCurriculumOverviewTable } from "./class-curriculum-overview-table";

describe("ClassCurriculumOverviewTable", () => {
  it("renders the required curriculum columns and class-scoped evidence links", () => {
    render(<ClassCurriculumOverviewTable
      classId="class-1"
      unit={{code:"4",title:"Programming"}}
      rows={[{
        learnerId:"learner-1",learnerName:"Alex Learner",
        startingPoint:{status:"Recorded",detail:"62% starting point",tone:"info"},
        unitProgress:{status:"In progress",detail:"Two modules started",tone:"info"},
        currentModule:{status:"Programming constructs",detail:"Lesson 2",tone:"info"},
        assessment:{status:"Not recorded",detail:"No completed class assessment is stored.",tone:"neutral"},
        targets:{status:"1 active",detail:"Next due 10/09/2026.",tone:"info"},
        attention:{status:"On track",detail:"No action is currently due.",tone:"positive"},
      }]}
    />);

    for(const heading of [
      "Student","Starting Point","Unit Progress","Current Module",
      "Assessment","Targets","Attention",
    ]) expect(screen.getByRole("columnheader",{name:heading})).toBeInTheDocument();
    expect(screen.getByRole("link",{name:"Alex Learner"}))
      .toHaveAttribute("href","/teacher/learners/learner-1?classId=class-1");
    expect(screen.getByRole("link",{name:/Recorded 62% starting point/}))
      .toHaveAttribute("href","/teacher/learners/learner-1/evidence?classId=class-1");
    expect(screen.getByRole("link",{name:/1 active Next due/}))
      .toHaveAttribute("href","/teacher/learners/learner-1?classId=class-1");
  });
});

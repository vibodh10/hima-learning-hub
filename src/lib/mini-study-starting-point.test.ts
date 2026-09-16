import {describe,expect,it} from "vitest";
import {isCombinedUnit2Unit6,startingPointDisplayTitle,startingPointQuestionsForAssignment} from "./mini-study-starting-point";

describe("combined Unit 2 and Unit 6 starting point",()=>{
  it("uses one ten-question check containing both units",()=>{
    const questions=startingPointQuestionsForAssignment("2",["2","6"]);
    expect(isCombinedUnit2Unit6(["2","6"])).toBe(true);
    expect(questions).toHaveLength(10);
    expect(questions.filter(question=>question.id.startsWith("prereq:"))).toHaveLength(6);
    expect(questions.filter(question=>question.id.startsWith("baseline-"))).toHaveLength(4);
    expect(questions.map(question=>question.id)).toEqual(expect.arrayContaining([
      "baseline-purpose-v1","baseline-usability-v1","baseline-access-v1","baseline-evidence-v1",
    ]));
    expect(questions.every(question=>question.options.some(option=>option.text.startsWith("Time expired")))).toBe(true);
    expect(startingPointDisplayTitle("Information Technology Systems",["2","6"])).toBe("Unit 2 and Unit 6");
  });

  it("leaves a Unit 2-only group on its existing ten-question starting point",()=>{
    const questions=startingPointQuestionsForAssignment("2",["2"]);
    expect(questions).toHaveLength(10);
    expect(questions.every(question=>question.id.startsWith("prereq:"))).toBe(true);
    expect(startingPointDisplayTitle("Unit 2",["2"])).toBe("Unit 2");
  });

  it("makes other timed starting points safe on timeout",()=>{
    const questions=startingPointQuestionsForAssignment("6",["6"]);
    expect(questions).toHaveLength(4);
    expect(questions.every(question=>question.options.some(option=>option.text.startsWith("Time expired")))).toBe(true);
  });
});

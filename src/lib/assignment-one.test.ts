import {describe,expect,it} from "vitest";
import {assignmentSchedule,assignmentSteps} from "./assignment-one";

describe("Assignment 1 calendar",()=>{
  it("uses the London date at midnight, not the browser or UTC day",()=>{
    expect(assignmentSchedule(new Date("2026-09-27T22:59:59Z"))).toMatchObject({phase:"preparing",days:1});
    expect(assignmentSchedule(new Date("2026-09-27T23:00:00Z"))).toMatchObject({phase:"due",days:0,today:"2026-09-28"});
    expect(assignmentSchedule(new Date("2026-09-28T23:00:00Z"))).toMatchObject({phase:"past",days:-1});
  });
  it.each([
    ["2026-09-14","before","choose"],
    ["2026-09-15","preparing","choose"],
    ["2026-09-17","preparing","choose"],
    ["2026-09-18","preparing","design"],
    ["2026-09-20","preparing","design"],
    ["2026-09-21","preparing","compare"],
    ["2026-09-24","preparing","evaluate"],
    ["2026-09-26","preparing","review"],
    ["2026-09-28","due","submit"],
    ["2026-09-29","past","submit"],
  ])("offers a useful checkpoint on %s",(day,phase,id)=>{
    const schedule=assignmentSchedule(new Date(`${day}T12:00:00Z`));
    expect(schedule.phase).toBe(phase);
    expect(assignmentSteps[schedule.current].id).toBe(id);
  });
});

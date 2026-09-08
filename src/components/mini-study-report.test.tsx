import {afterEach,describe,expect,it} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {MiniStudyReport} from "./mini-study-report";
import type {MiniStudyRecord} from "@/lib/mini-study-report";
afterEach(cleanup);
const record:MiniStudyRecord={id:"session",learner_id:"a",kind:"daily",status:"review",content:{title:"Website purpose"},grade:{correct:0,total:1,feedback:[{questionId:"q",prompt:"Who uses this site?",selectedAnswer:"Nobody",correctAnswer:"Its intended audience",correct:false,recap:false,skill:"audience",explanation:"Choose features for the people using the site."}]},target_text:"Review the intended audience.",needs_help:true,checked_at:"2026-09-08T09:00:00Z",completed_at:null};
describe("teacher mini-study evidence",()=>{
 it("shows the stored first response, question and automatic target",()=>{
  render(<MiniStudyReport learners={[{id:"a",name:"Learner A"}]} records={[record]}/>);
  expect(screen.getByText("First answer: Nobody")).toBeInTheDocument();
  expect(screen.getByText("Who uses this site?")).toBeInTheDocument();
  expect(screen.getByText("Review the intended audience.")).toBeInTheDocument();
  expect(screen.getByText(/Feedback review not yet finished/)).toBeInTheDocument();
 });
 it("does not turn no evidence into zero marks or display another learner's record",()=>{
  render(<MiniStudyReport learners={[{id:"b",name:"Learner B"}]} records={[record]}/>);
  expect(screen.getByText("No daily check recorded yet.")).toBeInTheDocument();
  expect(screen.queryByText("First answer: Nobody")).not.toBeInTheDocument();
 });
});

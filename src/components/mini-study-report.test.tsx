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
 it("shows multi-unit progress separately instead of combining the learner's evidence",()=>{
  const unit2:MiniStudyRecord={...record,id:"u2",unit_id:"unit-2",status:"completed",completed_at:"2026-09-08T09:02:00Z",content:{title:"Database keys"},grade:{correct:2,total:2,feedback:[]},target_text:"Continue Unit 2.",needs_help:false};
  const unit6:MiniStudyRecord={...record,id:"u6",unit_id:"unit-6",status:"completed",completed_at:"2026-09-08T09:03:00Z",content:{title:"Website purpose"},grade:{correct:0,total:2,feedback:[]},target_text:"Reinforce Unit 6.",needs_help:true};
  render(<MiniStudyReport learners={[{id:"a",name:"Learner A"}]} records={[unit2,unit6]} units={[{id:"unit-2",label:"Unit 2: Creating Systems"},{id:"unit-6",label:"Unit 6: Website Development"}]}/>);
  expect(screen.getByText("Unit 2: Creating Systems")).toBeInTheDocument();
  expect(screen.getByText("Unit 6: Website Development")).toBeInTheDocument();
  expect(screen.getByText("Continue Unit 2.")).toBeInTheDocument();
  expect(screen.getByText("Reinforce Unit 6.")).toBeInTheDocument();
  expect(screen.getByText("Secure on recent practice")).toBeInTheDocument();
  expect(screen.getByText("Building foundations")).toBeInTheDocument();
 });
});

import {describe,expect,it} from "vitest";
import {miniStudyCsv} from "./mini-study-csv";
import type {MiniStudyRecord} from "./mini-study-report";
const record:MiniStudyRecord={id:"s",learner_id:"a",kind:"daily",status:"completed",content:{title:"Contrast"},grade:{correct:2,total:2,feedback:[{questionId:"q",prompt:"Recall?",selectedAnswer:"A",correctAnswer:"B",correct:false,recap:true,skill:"accessibility",explanation:"Review"}]},target_text:"Review accessibility",needs_help:false,checked_at:"2026-09-08T10:00:00Z",completed_at:"2026-09-08T10:01:00Z"};
describe("short-study spreadsheet",()=>{
 it("separates recap from new learning and preserves first answers",()=>{
  const csv=miniStudyCsv("Group",[{id:"a",name:"Student"}],[record],[]);
  expect(csv).toContain('"2","2","0","1","1"');
  expect(csv).toContain('"Recap: Recall?","A","B","Needs practice"');
  expect(csv).toContain("not assignment grades");
 });
 it("excludes other learners and safely quotes formula-like names",()=>{
  const csv=miniStudyCsv('Group, "A"',[{id:"b",name:"=1+1"}],[record],[]);
  expect(csv).not.toContain("Review accessibility");
  expect(csv).toContain('"\'=1+1"');
  expect(csv).toContain('"Group, ""A"""');
  expect(csv).toContain('"No daily check recorded"');
 });
 it("labels a retained full baseline separately from a short baseline",()=>{
  const csv=miniStudyCsv("Group",[{id:"a",name:"Student"}],[],[{learner_id:"a",correct_count:16,question_count:21,completed_at:"2026-09-01"}]);
  expect(csv).toContain('"Existing full-unit starting point","Preserved full-unit assessment","2026-09-01","16","21"');
 });
});

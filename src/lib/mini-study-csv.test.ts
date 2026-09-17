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
 it("keeps current practice and starting evidence separate for each active unit",()=>{
  const unit2:MiniStudyRecord={...record,id:"u2",unit_id:"unit-2",content:{title:"Database keys"},target_text:"Continue Unit 2."};
  const unit6:MiniStudyRecord={...record,id:"u6",unit_id:"unit-6",content:{title:"Website purpose"},grade:{correct:0,total:2,feedback:[]},target_text:"Reinforce Unit 6.",needs_help:true};
  const csv=miniStudyCsv("Thursday",[{id:"a",name:"Student"}],[unit2,unit6],[
    {learner_id:"a",unit_id:"unit-2",correct_count:8,question_count:10,completed_at:"2026-09-01"},
    {learner_id:"a",unit_id:"unit-6",correct_count:4,question_count:10,completed_at:"2026-09-02"},
  ],[{id:"unit-2",label:"Unit 2: Creating Systems"},{id:"unit-6",label:"Unit 6: Website Development"}]);
  expect(csv).toContain('"Unit 2: Creating Systems"');
  expect(csv).toContain('"Unit 6: Website Development"');
  expect(csv).toContain('"8 of 10"');
  expect(csv).toContain('"4 of 10"');
  expect(csv).toContain('"Secure on recent practice"');
  expect(csv).toContain('"Building foundations"');
 });
});

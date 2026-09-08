import {describe,expect,it} from "vitest";
import {miniStudyLearnerSummary,type MiniStudyRecord} from "./mini-study-report";

function record(extra:Partial<MiniStudyRecord>={}):MiniStudyRecord{return {id:"1",learner_id:"learner",kind:"daily",status:"completed",content:{title:"Purpose"},grade:{correct:1,total:2,feedback:[{questionId:"recap",correct:false,recap:true,skill:"purpose",explanation:"",correctAnswer:""}]},target_text:"Review the purpose example.",needs_help:false,checked_at:"2026-09-08T12:00:00Z",completed_at:"2026-09-08T12:01:00Z",...extra};}
describe("teacher short-study evidence",()=>{
 it("keeps absent evidence unknown, not zero",()=>{
  const summary=miniStudyLearnerSummary([]);
  expect(summary.baseline).toBeNull();expect(summary.latest).toBeNull();expect(summary.recap).toBeNull();
 });
 it("separates starting point, new learning and recap without inventing a progress percentage",()=>{
  const summary=miniStudyLearnerSummary([record({id:"baseline",kind:"baseline",grade:{correct:3,total:4,feedback:[]},checked_at:"2026-09-07T12:00:00Z"}),record()]);
  expect(summary.baseline?.correct).toBe(3);expect(summary.latest?.grade.correct).toBe(1);expect(summary.recap).toEqual({correct:0,total:1});
  expect(summary.completedSteps).toBe(1);expect(summary).not.toHaveProperty("improvement");
 });
 it("shows a checked but unfinished step honestly and preserves its support target",()=>{
  const summary=miniStudyLearnerSummary([record({status:"review",completed_at:null,needs_help:true})]);
  expect(summary.latest?.finished).toBe(false);expect(summary.completedSteps).toBe(0);expect(summary.needsHelp).toBe(true);expect(summary.target).toBe("Review the purpose example.");
 });
 it("ignores abandoned attempts and selects the latest dated evidence",()=>{
  const summary=miniStudyLearnerSummary([record({id:"old",checked_at:"2026-09-01T12:00:00Z",needs_help:true}),record(),record({id:"abandoned",status:"abandoned",checked_at:"2026-09-10T12:00:00Z",needs_help:true})]);
  expect(summary.latest?.checkedAt).toBe("2026-09-08T12:00:00Z");expect(summary.needsHelp).toBe(false);
 });
});

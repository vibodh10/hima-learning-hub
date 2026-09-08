import {describe,expect,it} from "vitest";
import {selectStudyAssignment,studyHistoryForUnit,studySupportBaseline,type StudyAssignment,type StudyHistoryRow} from "./mini-study-planning";

const a:StudyAssignment={classId:"a",unitId:"6",unitCode:"6",unitTitle:"Websites"};
const b:StudyAssignment={classId:"b",unitId:"11",unitCode:"11",unitTitle:"Security"};
const row=(change:Partial<StudyHistoryRow>={}):StudyHistoryRow=>({class_id:"a",unit_id:"6",kind:"daily",lesson_id:"purpose",status:"completed",grade:{correct:1,total:2,feedback:[]},completed_at:"2026-09-08T09:00:00Z",...change});

describe("teacher-assigned mini-learning planning",()=>{
 it("gives an unvisited assigned group its turn without a unit picker",()=>{
  expect(selectStudyAssignment([a,b],[row()])).toEqual(b);
  expect(selectStudyAssignment([b,a],[])).toEqual(a);
 });
 it("finishes a valid saved step before rotating",()=>{
  expect(selectStudyAssignment([a,b],[row({status:"review",completed_at:null})])).toEqual(a);
 });
 it("never resumes a removed group or its old unit",()=>{
  expect(selectStudyAssignment([b],[row({status:"opened",completed_at:null})])).toEqual(b);
  expect(selectStudyAssignment([],[])).toBeUndefined();
 });
 it("rotates to the least recently completed group",()=>{
  expect(selectStudyAssignment([a,b],[row(),row({class_id:"b",unit_id:"11",completed_at:"2026-09-09T09:00:00Z"})])).toEqual(a);
 });
 it("does not let an exhausted unit block another ready assigned unit",()=>{
  expect(selectStudyAssignment([a,b],[],assignment=>assignment.unitId==="11")).toEqual(b);
  expect(selectStudyAssignment([a,b],[],()=>false)).toEqual(a);
  expect(selectStudyAssignment([a,b],[row({status:"review",completed_at:null})],assignment=>assignment.unitId==="11")).toEqual(a);
 });
 it("retains same-unit history across transfers in true completion order",()=>{
  const history=studyHistoryForUnit([row(),row({class_id:"old-group",kind:"baseline",lesson_id:"baseline",completed_at:"2026-09-07T09:00:00Z"}),row({unit_id:"11"}),row({status:"review",completed_at:null}),row({status:"abandoned"})],"6");
  expect(history.map(r=>r.lessonId)).toEqual(["baseline","purpose"]);
 });
 it("reuses the first mini baseline, not a later practice result",()=>{
  expect(studySupportBaseline([row(),row({class_id:"old-group",kind:"baseline",grade:{correct:3,total:4,feedback:[]}})],"6")).toEqual({correct:3,total:4,feedback:[]});
 });
 it("uses an existing full-unit baseline without inventing skill evidence",()=>{
  expect(studySupportBaseline([],"6",{correct_count:16,question_count:21})).toEqual({correct:16,total:21,feedback:[]});
  expect(studySupportBaseline([row({unit_id:"11",kind:"baseline"})],"6")).toBeUndefined();
 });
});

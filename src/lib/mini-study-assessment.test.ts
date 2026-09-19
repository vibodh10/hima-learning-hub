import {describe,expect,it} from "vitest";
import {assessmentPlanFor,assessmentPreviewPlan,assessmentSkillStates,reinforcementLessonFor,upcomingAssessmentWindows} from "./mini-study-assessment";
import type {StudyCompletion,StudyLesson} from "./mini-study";

function lesson(id:string,skill:string):StudyLesson{return {
 id,unitCode:"4",topicCode:"A1",title:id,skill,lines:["Learn it"],example:"Example",support:"Help",analysis:"Analyse",evaluation:"Evaluate",sources:[],
 questions:[
  {id:`${id}-1`,skill,kind:"choice",prompt:"Q1",options:[{id:"a",text:"A"},{id:"b",text:"B"}],answer:"a",explanation:"A"},
  {id:`${id}-2`,skill,kind:"choice",prompt:"Q2",options:[{id:"a",text:"A"},{id:"b",text:"B"}],answer:"a",explanation:"A"},
 ]
};}
const lessons=[lesson("u4-variables-v1","variables"),lesson("u4-selection-v1","selection"),lesson("u4-iteration-v1","iteration"),lesson("u4-data-types-operators-v1","data-types"),lesson("u4-functions-parameters-v1","functions")];
const correct=(skill:string)=>({questionId:`${skill}-q`,correct:true,recap:false,skill,explanation:"",correctAnswer:"A"});
const wrong=(skill:string)=>({...correct(skill),correct:false});
function completed(id:string,day:string,skill="variables",ok=true):StudyCompletion{return {lessonId:id,completedAt:`${day}T12:00:00Z`,kind:"daily",feedback:[ok?correct(skill):wrong(skill)]};}

describe("automatic assessment schedule",()=>{
 it("does not open the first formative before its required week",()=>{
  expect(assessmentPlanFor("2026-09-20","4",lessons,[])).toBeNull();
 });
 it("opens Formative Assessment 1 for the whole week beginning 21 September without requiring Hima lesson completion",()=>{
  const monday=assessmentPlanFor("2026-09-21","4",lessons,[]);
  const sunday=assessmentPlanFor("2026-09-27","4",lessons,[]);
  expect(monday?.kind).toBe("formative");expect(monday?.title).toBe("Formative Assessment 1");expect(monday?.questions.length).toBe(8);
  expect(sunday?.title).toBe("Formative Assessment 1");
 });
 it("keeps Formative Assessment 1 compulsory after its original week if it was missed",()=>{
  expect(assessmentPlanFor("2026-09-28","4",lessons,[])?.title).toBe("Formative Assessment 1");
  expect(assessmentPlanFor("2026-10-05","4",lessons,[])?.title).toBe("Formative Assessment 1");
 });
 it("presents Formative Assessment 2 once Formative Assessment 1 is complete",()=>{
  const history=[completed("assessment:u4:formative:1","2026-09-22")];
  const plan=assessmentPlanFor("2026-10-05","4",lessons,history);
  expect(plan?.kind).toBe("formative");expect(plan?.title).toBe("Formative Assessment 2");
 });
 it("runs Summative Assessment 1 after the earlier formative checks are complete",()=>{
  const history=[completed("assessment:u4:formative:1","2026-09-22"),completed("assessment:u4:formative:2","2026-10-06")];
  const plan=assessmentPlanFor("2026-10-12","4",lessons,history);
  expect(plan?.kind).toBe("summative");expect(plan?.title).toBe("Summative Assessment 1");
 });
 it("does not repeat a completed numbered assessment inside its week",()=>{
  const history=[completed("assessment:u4:formative:1","2026-09-22")];
  expect(assessmentPlanFor("2026-09-25","4",lessons,history)).toBeNull();
 });
 it("does not add untaught formal topics just because a Hima lesson was completed",()=>{
  const history=[completed("u4-functions-parameters-v1","2026-09-20","functions")];
  const plan=assessmentPlanFor("2026-09-21","4",lessons,history);
  expect(plan?.questions.some(question=>question.skill==="functions")).toBe(false);
 });
 it("lets the teacher preview Formative Assessment 1 before the student window opens",()=>{
  const window=upcomingAssessmentWindows("2026-09-19",4)[0];
  const preview=assessmentPreviewPlan(window,"4",lessons);
  expect(window.title).toBe("Formative Assessment 1");
  expect(window.start).toBe("2026-09-21");expect(window.end).toBe("2026-09-27");
  expect(preview?.questions.length).toBe(8);
 });
});

describe("automatic reinforcement",()=>{
 it("queues practice for an unresolved assessment skill",()=>{
  const history=[completed("assessment:u4:formative:1","2026-09-22","variables",false)];
  const retry=reinforcementLessonFor(lessons,history);
  expect(retry?.skill).toBe("variables");expect(retry?.id).toContain("reinforce:assessment:u4:formative:1:variables:1");
 });
 it("clears reinforcement after later secure evidence",()=>{
  const history=[completed("assessment:u4:formative:1","2026-09-22","variables",false),completed("reinforce:assessment:u4:formative:1:variables:1","2026-09-23","variables",true)];
  expect(reinforcementLessonFor(lessons,history)).toBeUndefined();
 });
});

describe("skill labels",()=>{
 it("reports secure developing and reinforcement states",()=>{
  const grade={correct:3,total:6,feedback:[correct("secure"),correct("secure"),correct("developing"),wrong("developing"),wrong("weak"),wrong("weak")]};
  expect(assessmentSkillStates(grade).map(item=>[item.skill,item.state])).toEqual([["secure","Secure"],["developing","Developing"],["weak","Needs reinforcement"]]);
 });
});

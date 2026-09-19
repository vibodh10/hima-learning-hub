import {describe,expect,it} from "vitest";
import {assessmentPlanFor,assessmentSkillStates,reinforcementLessonFor} from "./mini-study-assessment";
import type {StudyCompletion,StudyLesson} from "./mini-study";

function lesson(id:string,skill:string):StudyLesson{return {
 id,unitCode:"4",topicCode:"A1",title:id,skill,lines:["Learn it"],example:"Example",support:"Help",analysis:"Analyse",evaluation:"Evaluate",sources:[],
 questions:[
  {id:`${id}-1`,skill,kind:"choice",prompt:"Q1",options:[{id:"a",text:"A"},{id:"b",text:"B"}],answer:"a",explanation:"A"},
  {id:`${id}-2`,skill,kind:"choice",prompt:"Q2",options:[{id:"a",text:"A"},{id:"b",text:"B"}],answer:"a",explanation:"A"},
 ]
};}
const lessons=[lesson("u4-variables-v1","variables"),lesson("u4-data-types-operators-v1","data-types"),lesson("u4-iteration-v1","iteration"),lesson("u4-functions-parameters-v1","functions")];
const correct=(skill:string)=>({questionId:`${skill}-q`,correct:true,recap:false,skill,explanation:"",correctAnswer:"A"});
const wrong=(skill:string)=>({...correct(skill),correct:false});
function completed(id:string,day:string,skill="variables",ok=true):StudyCompletion{return {lessonId:id,completedAt:`${day}T12:00:00Z`,kind:"daily",feedback:[ok?correct(skill):wrong(skill)]};}

describe("automatic assessment cycle",()=>{
 it("does not assess before enough learning evidence",()=>{
  expect(assessmentPlanFor("2026-09-19","4",lessons,[completed("u4-variables-v1","2026-09-10")])).toBeNull();
 });
 it("creates formative assessment in the first fortnightly cycle",()=>{
  const history=[completed("u4-variables-v1","2026-09-10"),completed("u4-iteration-v1","2026-09-11","iteration")];
  const plan=assessmentPlanFor("2026-09-19","4",lessons,history);
  expect(plan?.kind).toBe("formative");expect(plan?.title).toBe("Formative Assessment 1");expect(plan?.questions.length).toBe(6);
 });
 it("uses a summative check instead of a second formative on the four-week cycle",()=>{
  const history=[completed("u4-variables-v1","2026-09-10"),completed("u4-iteration-v1","2026-09-11","iteration")];
  const plan=assessmentPlanFor("2026-09-29","4",lessons,history);
  expect(plan?.kind).toBe("summative");expect(plan?.title).toBe("Summative Assessment 1");
 });
 it("does not repeat the same assessment cycle",()=>{
  const history=[completed("u4-variables-v1","2026-09-10"),completed("u4-iteration-v1","2026-09-11","iteration"),completed("assessment:u4:formative:1:c1","2026-09-18")];
  expect(assessmentPlanFor("2026-09-19","4",lessons,history)).toBeNull();
 });
});

describe("automatic reinforcement",()=>{
 it("queues practice for an unresolved assessment skill",()=>{
  const history=[completed("assessment:u4:formative:1:c1","2026-09-18","variables",false)];
  const retry=reinforcementLessonFor(lessons,history);
  expect(retry?.skill).toBe("variables");expect(retry?.id).toContain("reinforce:assessment:u4:formative:1:c1:variables:1");
 });
 it("clears reinforcement after later secure evidence",()=>{
  const history=[completed("assessment:u4:formative:1:c1","2026-09-18","variables",false),completed("reinforce:assessment:u4:formative:1:c1:variables:1","2026-09-19","variables",true)];
  expect(reinforcementLessonFor(lessons,history)).toBeUndefined();
 });
});

describe("skill labels",()=>{
 it("reports secure developing and reinforcement states",()=>{
  const grade={correct:3,total:6,feedback:[correct("secure"),correct("secure"),correct("developing"),wrong("developing"),wrong("weak"),wrong("weak")]};
  expect(assessmentSkillStates(grade).map(item=>[item.skill,item.state])).toEqual([["secure","Secure"],["developing","Developing"],["weak","Needs reinforcement"]]);
 });
});

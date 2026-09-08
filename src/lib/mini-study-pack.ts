import type {StudyLesson,StudyQuestionKey} from "./mini-study";
import {pearsonSpecificationSource} from "./extended-pearson-units";

export type ShortStudyIdea={
 id:string;topic:string;title:string;skill:string;lines:string[];example:string;help:string;
 question:string;answers:[string,string,string];feedback:string;pairs:[[string,string],[string,string]];
 analyse:string;evaluate:string;sources?:string[];
};

/** Each original idea remains a small explanation and two discrete checks. */
export function makeStudyPack(unitCode:string,ideas:ShortStudyIdea[]){
 const lessons:StudyLesson[]=ideas.map(idea=>{
  const prefix=`u${unitCode}-${idea.id}`;
  const questions:StudyQuestionKey[]=[
   {id:`${prefix}-choice`,skill:idea.skill,kind:"choice",prompt:idea.question,options:idea.answers.map((text,i)=>({id:`o${i+1}`,text})),answer:"o1",explanation:idea.feedback},
   {id:`${prefix}-match`,skill:idea.skill,kind:"match",prompt:"Match each idea to its meaning.",stems:idea.pairs.map(([text],i)=>({id:`s${i+1}`,text})),options:idea.pairs.map(([,text],i)=>({id:`o${i+1}`,text})),answer:{s1:"o1",s2:"o2"},explanation:idea.feedback},
  ];
  return {id:`${prefix}-v1`,unitCode,topicCode:idea.topic,title:idea.title,skill:idea.skill,lines:idea.lines,example:idea.example,support:idea.help,analysis:idea.analyse,evaluation:idea.evaluate,questions,sources:[pearsonSpecificationSource,...(idea.sources??[])]};
 });
 // A stable, basic first instrument; not the full qualification's assessment.
 const baseline=lessons.slice(0,4).map(lesson=>{
  const question=lesson.questions[0];
  return {...question,id:`baseline:${question.id}:v1`,options:[...question.options,{id:"unsure",text:"I'm not sure yet"}]};
 });
 return {version:`u${unitCode}-mini-v1`,lessons,baseline};
}

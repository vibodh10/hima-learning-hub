import type {StudyQuestionKey} from "./mini-study";
import {studyContentFor} from "./mini-study-content";
import {startingPointQuestions} from "./starting-point";

const combinedUnit2Skills=new Set([
  "prereq-privacy",
  "prereq-security",
  "prereq-logic",
  "prereq-data",
  "prereq-evidence",
  "prereq-testing",
]);

export function isCombinedUnit2Unit6(unitCodes:string[]):boolean {
  return unitCodes.includes("2")&&unitCodes.includes("6");
}

function withTimeoutOption(question:StudyQuestionKey):StudyQuestionKey {
  if(question.kind!=="choice"||question.options.some(option=>option.text.startsWith("Time expired")))return question;
  return {...question,options:[...question.options,{id:"timeout",text:"Time expired — needs another check"}]};
}

/**
 * The timed player and the database both currently support at most ten questions.
 * For the Thursday Unit 2 + Unit 6 group we therefore use one ten-question
 * instrument: six broad IT/database prerequisites plus all four Unit 6 checks.
 */
export function startingPointQuestionsForAssignment(unitCode:string,classUnitCodes:string[]):StudyQuestionKey[] {
  if(isCombinedUnit2Unit6(classUnitCodes)) {
    const unit2=startingPointQuestions.filter(question=>combinedUnit2Skills.has(question.skill));
    const unit6=studyContentFor("6")?.baseline??[];
    return [...unit2,...unit6].map(withTimeoutOption);
  }
  const questions=unitCode==="2"?startingPointQuestions:(studyContentFor(unitCode)?.baseline??startingPointQuestions);
  return questions.map(withTimeoutOption);
}

export function startingPointDisplayTitle(unitTitle:string,classUnitCodes:string[]):string {
  return isCombinedUnit2Unit6(classUnitCodes)?"Unit 2 and Unit 6":unitTitle;
}

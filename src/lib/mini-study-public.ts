import type {StudyGrade} from "./mini-study";
import type {StudyHome} from "./mini-study-server";

function safeAssessmentGrade(grade:StudyGrade,questionId:string|undefined):StudyGrade{
  if(!questionId)return {correct:grade.correct,total:grade.total,feedback:[]};
  return {correct:grade.correct,total:grade.total,feedback:[{
    questionId,correct:grade.correct===grade.total,recap:false,skill:"assessment",
    explanation:"Detailed question feedback is kept for your tutor during the assessment period. The Digital Learning Hub will automatically select any second practice you need.",
    correctAnswer:"Detailed answers are not released during the assessment period.",prompt:"Your assessment has been submitted."
  }]};
}

/** Never send a saved formal-assessment answer key back to the learner on reload. */
export function studentSafeStudyHome(home:StudyHome):StudyHome{
  if(home.status!=="active"||!home.card.assessmentKind||!home.grade)return home;
  return {...home,grade:safeAssessmentGrade(home.grade,home.card.questions[0]?.id)};
}

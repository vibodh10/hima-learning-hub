import {describe,expect,it} from "vitest";
import {programmingStudy} from "./mini-study-programming";
import {gradeStudy,studyQuestionSet} from "./mini-study";

describe("Unit 4 question variety",()=>{
  it("uses different, correctly marked starting-point, lesson and recap questions without resetting lesson identities",()=>{
    expect(programmingStudy.lessons.map(lesson=>lesson.id)).toEqual(["u4-decompose-v1","u4-variables-v1","u4-selection-v1","u4-iteration-v1"]);
    for(const [index,lesson] of programmingStudy.lessons.entries()){
      const recap=studyQuestionSet(programmingStudy.lessons[0],lesson)[0];
      const baseline=programmingStudy.baseline[index];
      expect(new Set([baseline.prompt,lesson.questions[0].prompt,recap.prompt.replace("Quick recap: ","")]).size).toBe(3);
      for(const question of [baseline,lesson.questions[0],lesson.recapQuestion!]){
        expect(gradeStudy([question],[{questionId:question.id,answer:question.answer}])?.correct).toBe(1);
        const wrong=question.options.find(option=>option.id!==question.answer)!;
        expect(gradeStudy([question],[{questionId:question.id,answer:wrong.id}])?.correct).toBe(0);
      }
      expect(recap.recap).toBe(true);
    }
  });
});

import {describe,expect,it} from "vitest";
import {studyContentFor} from "./mini-study-content";
import {gradeStudy,publicStudyQuestions} from "./mini-study";

describe("assigned-unit short study packs",()=>{
  it.each(["2","4","5","6","9","11","16","19"])("keeps Unit %s short, basic and independently markable",code=>{
    const pack=studyContentFor(code)!;
    expect(pack.baseline).toHaveLength(4);
    const all=[...pack.baseline,...pack.lessons.flatMap(l=>l.questions)];
    expect(new Set(all.map(q=>q.id)).size).toBe(all.length);
    expect(new Set(pack.lessons.map(l=>l.id)).size).toBe(pack.lessons.length);
    for(const lesson of pack.lessons){
      expect(lesson.unitCode).toBe(code);
      expect(lesson.lines.length).toBeLessThanOrEqual(4);
      expect(lesson.lines.join(" ").split(/\s+/).length).toBeLessThanOrEqual(60);
      expect(lesson.questions.map(q=>q.kind)).toEqual(["choice","match"]);
      expect(lesson.example.length).toBeGreaterThan(60);
      expect(lesson.analysis).not.toBe(lesson.evaluation);
      expect(lesson.sources[0]).toMatch(/^https:\/\/qualifications\.pearson\.com\//);
    }
    for(const q of pack.baseline) expect(q.options.some(o=>/not sure/i.test(o.text))).toBe(true);
    for(const q of all){
      expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
      for(let seed=0;seed<20;seed++){
        const shown=publicStudyQuestions([q],`pack-${seed}`)[0];
        expect(JSON.stringify(shown)).not.toMatch(/"answer":|"explanation":/);
        expect(gradeStudy([q],[{questionId:shown.id,answer:q.answer}])?.correct).toBe(1);
      }
      if(typeof q.answer==="string"){
        expect(q.options.some(o=>o.id===q.answer)).toBe(true);
        const wrong=q.options.find(o=>o.id!==q.answer)!;
        expect(gradeStudy([q],[{questionId:q.id,answer:wrong.id}])?.correct).toBe(0);
      }else{
        const stems=q.stems!;
        expect(stems).toHaveLength(2);
        const reversed={[stems[0].id]:q.answer[stems[1].id],[stems[1].id]:q.answer[stems[0].id]};
        expect(gradeStudy([q],[{questionId:q.id,answer:reversed}])?.correct).toBe(0);
      }
    }
  });
  it("does not substitute another unit's material for an unknown unit",()=>{
    expect(studyContentFor("unknown")).toBeUndefined();
  });
});

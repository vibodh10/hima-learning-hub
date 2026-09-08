import {describe,expect,it} from "vitest";
import {gradeStudy,nextStudyDay,nextStudyLesson,publicStudyQuestions,studyDay,studyQuestionSet,studyShuffle,studyThinking,type StudyCompletion} from "./mini-study";
import {unit6StudyBaseline,unit6StudyLessons} from "./mini-study-content";

describe("short self-study rules",()=>{
  it("uses the London calendar day including daylight saving",()=>{
    expect(studyDay(new Date("2026-09-08T23:15:00Z"))).toBe("2026-09-09");
    expect(studyDay(new Date("2026-12-08T23:15:00Z"))).toBe("2026-12-08");
    expect(nextStudyDay("2026-12-31")).toBe("2027-01-01");
  });
  it("keeps each lesson small and ties it to sources and specific examples",()=>{
    for(const lesson of unit6StudyLessons){
      expect(lesson.lines.length).toBeLessThanOrEqual(4);
      expect(lesson.lines.join(" ").split(/\s+/).length).toBeLessThanOrEqual(60);
      expect(lesson.questions).toHaveLength(2);
      expect(lesson.questions.map(q=>q.kind)).toEqual(["choice","match"]);
      expect(lesson.sources.length).toBeGreaterThan(0);
      expect(lesson.example.length).toBeGreaterThan(60);
      expect(lesson.support).not.toBe(lesson.analysis);
      expect(lesson.analysis).not.toBe(lesson.evaluation);
    }
  });
  it("marks every source answer correctly after all presentation permutations",()=>{
    const keys=[...unit6StudyBaseline,...unit6StudyLessons.flatMap(l=>l.questions)];
    for(let seed=0;seed<20;seed++)for(const key of keys){
      const publicKey=publicStudyQuestions([key],String(seed))[0];
      expect(publicKey.options.map(o=>o.id).sort()).toEqual(key.options.map(o=>o.id).sort());
      expect(gradeStudy([key],[{questionId:publicKey.id,answer:key.answer}])?.correct).toBe(1);
      expect(JSON.stringify(publicKey)).not.toMatch(/"answer":|"explanation":/);
    }
  });
  it("actually varies answer and matching order while staying stable within a session",()=>{
    const keys=unit6StudyLessons[0].questions;
    const orders=Array.from({length:30},(_,i)=>JSON.stringify(publicStudyQuestions(keys,`session-${i}`)));
    expect(new Set(orders).size).toBeGreaterThan(3);
    expect(studyShuffle([1,2,3,4],"same")).toEqual(studyShuffle([1,2,3,4],"same"));
    expect(keys[0].options[0].id).toBe("o1");
  });
  it("rejects missing, extra, duplicate, unknown and malformed answers",()=>{
    const keys=unit6StudyBaseline;
    const responses=keys.map(q=>({questionId:q.id,answer:q.answer}));
    for(const invalid of [null,{},[],responses.slice(1),[...responses,responses[0]],[responses[0],responses[0],responses[2],responses[3]],responses.map(r=>({...r,answer:"invented"})),responses.map(r=>({...r,notes:"private information"}))])expect(gradeStudy(keys,invalid)).toBeNull();
  });
  it("marks wrong choices and reversed pairs wrong, but rejects duplicated pair values",()=>{
    const [choice,pairs]=unit6StudyLessons[0].questions;
    expect(gradeStudy([choice],[{questionId:choice.id,answer:"o2"}])?.correct).toBe(0);
    expect(gradeStudy([pairs],[{questionId:pairs.id,answer:{s1:"o2",s2:"o1"}}])?.correct).toBe(0);
    expect(gradeStudy([pairs],[{questionId:pairs.id,answer:{s1:"o1",s2:"o1"}}])).toBeNull();
  });
  it("prioritises a starting-point gap, completes foundations before advanced reasoning and never repeats a finished lesson",()=>{
    const baseline:StudyCompletion={lessonId:"baseline",completedAt:"2026-09-08T12:00:00Z",kind:"baseline",feedback:[{questionId:"x",skill:"accessibility",correct:false,recap:false,explanation:"",correctAnswer:""}]};
    expect(nextStudyLesson(unit6StudyLessons,[baseline])?.skill).toBe("accessibility");
    const history=[baseline,...unit6StudyLessons.map(l=>({lessonId:l.id,completedAt:"2026-09-09T12:00:00Z",kind:"daily" as const,feedback:[]}))];
    expect(nextStudyLesson(unit6StudyLessons,history)).toBeUndefined();
    expect(nextStudyLesson(unit6StudyLessons,history.filter(h=>h.lessonId!==unit6StudyLessons[4].id))?.skill).toBe("analysis");
  });
  it("adds exactly one recap, separately marked, only for a completed previous idea",()=>{
    const [previous,next]=unit6StudyLessons;
    expect(studyQuestionSet(next)).toHaveLength(2);
    const keys=studyQuestionSet(next,previous);
    expect(keys).toHaveLength(3);
    expect(publicStudyQuestions(keys,"shuffle")[0].recap).toBe(true);
    const result=gradeStudy(keys,keys.map(q=>({questionId:q.id,answer:q.answer})))!;
    expect(result.correct).toBe(2);expect(result.total).toBe(2);expect(result.feedback.filter(f=>f.recap)).toHaveLength(1);
  });
  it("offers optional analysis and evaluation support without claiming to award grades",()=>{
    const lesson=unit6StudyLessons[0];
    expect(studyThinking(lesson)).toBeUndefined();
    expect(studyThinking(lesson,{correct:1,total:4,feedback:[]})).toBeUndefined();
    expect(studyThinking(lesson,{correct:2,total:4,feedback:[]})).toBe(lesson.analysis);
    expect(studyThinking(lesson,{correct:4,total:4,feedback:[]})).toBe(lesson.evaluation);
    expect(unit6StudyLessons.at(-1)?.questions[0].explanation).toContain("does not award a qualification grade");
  });
});

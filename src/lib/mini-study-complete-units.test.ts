import {describe,expect,it} from "vitest";
import {studyContentFor} from "./mini-study-content-expanded";
import {nextStudyLesson,type StudyCompletion} from "./mini-study";

function topics(unitCode:string){return new Set(studyContentFor(unitCode)?.lessons.map(lesson=>lesson.topicCode)??[]);}

describe("complete automatic study banks",()=>{
  it("covers the full Unit 2 topic map and includes stretch work",()=>{
    const content=studyContentFor("2")!;
    expect(content.lessons.length).toBeGreaterThanOrEqual(18);
    for(const code of ["A1","A2","A3","B1","B2","C1","C2","D1-D3"])expect(topics("2").has(code)).toBe(true);
    expect(content.lessons.some(lesson=>lesson.skill==="analysis")).toBe(true);
    expect(content.lessons.some(lesson=>lesson.skill==="evaluation")).toBe(true);
  });

  it("covers the full Unit 4 topic map and includes stretch work",()=>{
    const content=studyContentFor("4")!;
    expect(content.lessons.length).toBeGreaterThanOrEqual(20);
    for(const code of ["A1","A2-A3","A4","A5-A6","B1","B2","C1-C2","C3-C5"])expect(topics("4").has(code)).toBe(true);
    expect(content.lessons.some(lesson=>lesson.skill==="analysis")).toBe(true);
    expect(content.lessons.some(lesson=>lesson.skill==="evaluation")).toBe(true);
  });

  it("extends Unit 6 through design, build, scripting, publishing and review",()=>{
    const content=studyContentFor("6")!;
    expect(content.lessons.length).toBeGreaterThanOrEqual(24);
    for(const code of ["A1","A2","B1","B2","B2-C2","C1","C2","C3-C5"])expect(topics("6").has(code)).toBe(true);
    expect(content.lessons.some(lesson=>lesson.skill==="analysis")).toBe(true);
    expect(content.lessons.some(lesson=>lesson.skill==="evaluation")).toBe(true);
  });

  it("keeps challenge and evaluation steps until core work is complete",()=>{
    const content=studyContentFor("4")!;
    const core=content.lessons.filter(lesson=>!["analysis","evaluation"].includes(lesson.skill));
    const history:StudyCompletion[]=core.map((lesson,index)=>({lessonId:lesson.id,completedAt:`2026-09-${String(index+1).padStart(2,"0")}T12:00:00Z`,kind:"daily",feedback:[]}));
    const next=nextStudyLesson(content.lessons,history);
    expect(["analysis","evaluation"]).toContain(next?.skill);
  });
});

import {describe,expect,it} from "vitest";
import {buildFormativeCohortSummary,formativeCohortCsv} from "./formative-cohort-report";
import type {MiniStudyRecord} from "./mini-study-report";

function record(learner:string,number:number,correct:number,total:number,skill="variables"):MiniStudyRecord{
  return {
    id:`session-${learner}-${number}`,
    learner_id:learner,
    unit_id:"unit-2",
    lesson_id:`assessment:u2:formative:${number}`,
    kind:"daily",
    status:"completed",
    content:{assessmentKind:"formative",assessmentNumber:number,title:`Formative Assessment ${number}`},
    grade:{correct,total,feedback:[
      {questionId:"q1",correct:correct>0,recap:false,skill,explanation:"feedback",correctAnswer:"A",selectedAnswer:correct>0?"A":"B",prompt:"Question"}
    ]},
    target_text:null,
    needs_help:false,
    checked_at:`2026-09-${20+number}T10:00:00Z`,
    completed_at:`2026-09-${20+number}T10:05:00Z`,
  };
}

describe("formative cohort report",()=>{
  it("puts every learner into one assessment matrix and calculates movement",()=>{
    const summary=buildFormativeCohortSummary(
      [{id:"a",name:"Aisha"},{id:"b",name:"Ben"}],
      [record("a",1,1,2),record("a",2,2,2),record("b",1,0,2)],
      "unit-2",
    );
    expect(summary.assessmentNumbers).toEqual([1,2]);
    expect(summary.stats[0]).toMatchObject({number:1,completed:2,average:25});
    expect(summary.learners.find(item=>item.id==="a")?.change).toBe(50);
    expect(summary.learners.find(item=>item.id==="b")?.latest?.percentage).toBe(0);
  });

  it("creates an Excel-friendly CSV including learners with no assessment",()=>{
    const summary=buildFormativeCohortSummary([{id:"a",name:"Aisha"},{id:"b",name:"Ben"}],[record("a",1,1,2)],"unit-2");
    const csv=formativeCohortCsv("DG Diploma","Unit 2",summary);
    expect(csv).toContain("Formative Assessment 1");
    expect(csv).toContain("Ben,Not completed");
  });
});

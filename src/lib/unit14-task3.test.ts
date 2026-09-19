import {describe,expect,it} from "vitest";
import {unit14Task3FinalChecklist,unit14Task3Lessons,unit14Task3QuestionFamilies,unit14Task3ScenarioDrills} from "./unit14-task3";

describe("Unit 14 Task 3 intensive practice",()=>{
  it("keeps a substantial Task 3 lesson bank",()=>{
    expect(unit14Task3Lessons.length).toBeGreaterThanOrEqual(10);
    for(const lesson of unit14Task3Lessons){
      expect(lesson.learn.length).toBeGreaterThanOrEqual(4);
      expect(lesson.quizzes.length).toBeGreaterThanOrEqual(2);
      expect(lesson.matching.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("covers network hardware and DFD levels explicitly",()=>{
    const hardware=unit14Task3Lessons.find(lesson=>lesson.id==="hardware");
    expect(hardware?.matching.map(item=>item.left)).toEqual(expect.arrayContaining(["Router","Firewall","Switch","Wireless access point","Server"]));
    const dfdText=unit14Task3Lessons.find(lesson=>lesson.id==="dfd-levels")?.learn.join(" ").toLowerCase()??"";
    expect(dfdText).toContain("context");
    expect(dfdText).toContain("level 0");
    expect(dfdText).toContain("level 1");
  });

  it("provides repeated unfamiliar-scenario and exam-family practice",()=>{
    expect(unit14Task3ScenarioDrills.length).toBeGreaterThanOrEqual(8);
    expect(unit14Task3QuestionFamilies.length).toBeGreaterThanOrEqual(15);
    expect(unit14Task3FinalChecklist.length).toBeGreaterThanOrEqual(10);
  });
});

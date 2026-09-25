import {describe,expect,it} from "vitest";
import {studyContentFor} from "./mini-study-content-expanded";
import {nextSowRelease,releasedSowLessonIds,sowReleasesFor} from "./mini-study-sow-release";

describe("Unit 4 SOW-driven release",()=>{
  it("keeps later practical consolidation locked before the classroom teaching point",()=>{
    const ids=releasedSowLessonIds("4","2026-09-20");
    expect(ids).toContain("u4-functions-basics-v1");
    expect(ids).not.toContain("u4-program-environment-v1");
    expect(ids).not.toContain("u4-functions-parameters-v1");
    expect(ids).not.toContain("u4-pygame-runner-loop-v1");
  });

  it("starts the cumulative practical pathway after the first formative window opens",()=>{
    expect(nextSowRelease("4","2026-09-20")).toEqual({
      lessonId:"u4-program-environment-v1",
      releaseOn:"2026-09-22",
      title:"Read the shape of a Python program",
    });
    const ids=releasedSowLessonIds("4","2026-09-23");
    expect(ids).toContain("u4-program-environment-v1");
    expect(ids).toContain("u4-function-two-v1");
    expect(ids).toContain("u4-functions-parameters-v1");
    expect(ids).toContain("u4-while-practice-v1");
    expect(ids).toContain("u4-return-values-practice-v1");
  });

  it("combines functions loops decisions menus and lists before the game application",()=>{
    const ids=releasedSowLessonIds("4","2026-09-24");
    expect(ids).toContain("u4-function-while-v1");
    expect(ids).toContain("u4-function-while-if-v1");
    expect(ids).toContain("u4-choice-menu-if-v1");
    expect(ids).toContain("u4-function-menu-choice-if-v1");
    expect(ids).toContain("u4-lists-practical-v1");
    expect(ids).not.toContain("u4-pygame-runner-loop-v1");
  });

  it("releases the taught Pandas and Pygame runner consolidation by 25 September",()=>{
    const ids=releasedSowLessonIds("4","2026-09-25");
    expect(ids).toContain("u4-pandas-practical-v1");
    expect(ids).toContain("u4-pygame-runner-loop-v1");
    expect(ids).toContain("u4-pygame-moving-world-v1");
    expect(ids).toContain("u4-pygame-obstacles-v1");
    expect(ids).toContain("u4-scope-v1");

    const order=[
      "u4-function-two-v1",
      "u4-while-practice-v1",
      "u4-return-values-practice-v1",
      "u4-function-while-v1",
      "u4-function-while-if-v1",
      "u4-choice-menu-if-v1",
      "u4-function-menu-choice-if-v1",
      "u4-lists-practical-v1",
      "u4-pandas-practical-v1",
      "u4-pygame-runner-loop-v1",
      "u4-pygame-moving-world-v1",
      "u4-pygame-obstacles-v1",
    ];
    expect(order.map(id=>ids.indexOf(id))).toEqual([...order.map(id=>ids.indexOf(id))].sort((a,b)=>a-b));
  });

  it("continues automatically through the autumn Unit 4 sequence",()=>{
    expect(releasedSowLessonIds("4","2026-09-30")).toContain("u4-file-handling-v1");
    expect(releasedSowLessonIds("4","2026-10-09")).toContain("u4-tuples-dictionaries-v1");
    expect(releasedSowLessonIds("4","2026-11-06")).toContain("u4-pygame-events-v1");
    expect(releasedSowLessonIds("4","2026-12-02")).toContain("u4-libraries-reuse-v1");
  });
});

describe("Unit 19 SOW-driven release",()=>{
  it("keeps Unit 19 completely locked until January after Unit 14",()=>{
    expect(sowReleasesFor("10")).toEqual([]);
    expect(releasedSowLessonIds("19","2026-09-20")).toEqual([]);
    expect(releasedSowLessonIds("19","2026-12-31")).toEqual([]);
    expect(nextSowRelease("19","2026-12-31")).toEqual({
      lessonId:"u19-iot-foundations-v1",
      releaseOn:"2027-01-08",
      title:"Recognise a complete IoT system",
    });
  });

  it("starts the IoT sequence automatically in January 2027",()=>{
    expect(releasedSowLessonIds("19","2027-01-08")).toContain("u19-iot-foundations-v1");
    expect(releasedSowLessonIds("19","2027-01-08")).not.toContain("u19-applications-v1");
    expect(nextSowRelease("19","2027-01-08")).toEqual({
      lessonId:"u19-applications-v1",
      releaseOn:"2027-01-15",
      title:"Purpose and applications of IoT",
    });
    expect(releasedSowLessonIds("19","2027-03-26")).toContain("u19-design-docs-v1");
    expect(releasedSowLessonIds("19","2027-05-21")).toContain("u19-evaluation-v1");
  });
});

describe("scheduled lesson integrity",()=>{
  for(const unitCode of ["4","19"]){
    it(`has real lesson content for every Unit ${unitCode} scheduled release`,()=>{
      const content=studyContentFor(unitCode);
      const ids=new Set(content?.lessons.map(lesson=>lesson.id)??[]);
      for(const release of sowReleasesFor(unitCode))expect(ids.has(release.lessonId),release.lessonId).toBe(true);
    });
  }
});

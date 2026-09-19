import {describe,expect,it} from "vitest";
import {studyContentFor} from "./mini-study-content-expanded";
import {nextSowRelease,releasedSowLessonIds,sowReleasesFor} from "./mini-study-sow-release";

describe("Unit 4 SOW-driven release",()=>{
  it("keeps parameters locked before the next classroom teaching point",()=>{
    const ids=releasedSowLessonIds("4","2026-09-20");
    expect(ids).toContain("u4-functions-basics-v1");
    expect(ids).not.toContain("u4-functions-parameters-v1");
  });

  it("automatically releases parameters and returns after the scheduled lesson",()=>{
    expect(releasedSowLessonIds("4","2026-09-23")).toContain("u4-functions-parameters-v1");
    expect(nextSowRelease("4","2026-09-20")).toEqual({
      lessonId:"u4-functions-parameters-v1",
      releaseOn:"2026-09-23",
      title:"Functions with parameters and return values",
    });
  });

  it("continues automatically through the autumn Unit 4 sequence",()=>{
    expect(releasedSowLessonIds("4","2026-09-30")).toContain("u4-file-handling-v1");
    expect(releasedSowLessonIds("4","2026-10-09")).toContain("u4-tuples-dictionaries-v1");
    expect(releasedSowLessonIds("4","2026-11-06")).toContain("u4-pygame-events-v1");
    expect(releasedSowLessonIds("4","2026-12-02")).toContain("u4-libraries-reuse-v1");
  });
});

describe("Unit 19 SOW-driven release",()=>{
  it("follows the supplied IoT delivery plan rather than any Unit 10 sequence",()=>{
    expect(sowReleasesFor("10")).toEqual([]);
    expect(releasedSowLessonIds("19","2026-09-20")).toEqual(expect.arrayContaining([
      "u19-iot-foundations-v1","u19-applications-v1",
    ]));
    expect(releasedSowLessonIds("19","2026-09-20")).not.toContain("u19-principles-v1");
  });

  it("releases the next IoT topic after its teaching week",()=>{
    expect(nextSowRelease("19","2026-09-20")).toEqual({
      lessonId:"u19-principles-v1",
      releaseOn:"2026-09-25",
      title:"IoT principles and data-to-action",
    });
    expect(releasedSowLessonIds("19","2026-11-27")).toContain("u19-design-docs-v1");
    expect(releasedSowLessonIds("19","2027-02-05")).toContain("u19-evaluation-v1");
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

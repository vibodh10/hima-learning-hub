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
    expect(sowReleasesFor("4").length).toBeGreaterThanOrEqual(20);
  });

  it("has real lesson content for every scheduled release",()=>{
    const content=studyContentFor("4");
    const ids=new Set(content?.lessons.map(lesson=>lesson.id)??[]);
    for(const release of sowReleasesFor("4"))expect(ids.has(release.lessonId),release.lessonId).toBe(true);
  });
});

import { expect, it } from "vitest";
import { assessmentParentLabel } from "./assessment-parent-label";
it("does not label the course baseline as Unit 1", () => {
  expect(assessmentParentLabel({assessment_kind:"course_starting_point",lessons:{topics:{title:"Course starting point",units:{code:"1",title:"Information Technology Systems"}}}})).toBe("Course baseline · general background (not a unit assessment)");
});
it("preserves genuine unit assessment labels", () => {
  expect(assessmentParentLabel({lessons:[{topics:{title:"Website design",units:{code:"6",title:"Website Development"}}}]})).toBe("6 Website Development · Website design");
});

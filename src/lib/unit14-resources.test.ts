import {expect,it} from "vitest";
import {unit14Papers} from "./unit14-exam";
import {unit14TeacherPapers} from "./unit14-teacher-resources";
it("keeps all paper identifiers public but all download bundles and marking links teacher-side",()=>{
 expect(unit14Papers.map(p=>p.id)).toEqual(unit14TeacherPapers.map(p=>p.id));
 expect(unit14Papers.every(p=>p.links.length===0)).toBe(true);
 expect(unit14TeacherPapers.some(p=>p.links.some(l=>l.title.includes("Mark scheme")))).toBe(true);
 expect(unit14TeacherPapers.find(p=>p.id==="sample")?.links.length).toBe(1);
});

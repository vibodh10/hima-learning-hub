import {describe,expect,it} from "vitest";
import {unit2PracticeActivities,unit2PracticeSessions} from "./unit2-exam";

describe("Unit 2 exam rehearsal",()=>{
  it("contains the eight audited practical activities",()=>{
    expect(unit2PracticeActivities).toHaveLength(8);
    expect(unit2PracticeActivities.map(item=>item.number)).toEqual([1,2,3,4,5,6,7,8]);
  });
  it("splits the rehearsal into two four-activity sessions",()=>{
    expect(unit2PracticeSessions).toHaveLength(2);
    expect(unit2PracticeSessions[0].activities.map(item=>item.number)).toEqual([1,2,3,4]);
    expect(unit2PracticeSessions[1].activities.map(item=>item.number)).toEqual([5,6,7,8]);
  });
  it("makes activity 1 explicitly assess tables keys relationships and evidence",()=>{
    const text=[unit2PracticeActivities[0].task,...unit2PracticeActivities[0].evidence].join(" ").toLowerCase();
    expect(text).toContain("primary key");
    expect(text).toContain("foreign key");
    expect(text).toContain("relationship");
    expect(text).toContain("evidence");
  });
});

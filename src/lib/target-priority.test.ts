import {describe,expect,it} from "vitest";
import {selectNextTarget,type TargetCandidate} from "./target-priority";

const base:TargetCandidate={
  id:"base",unit_id:"unit-active",skill_id:"skill",status:"approved",
  target_date:"2026-08-10",reason:"Practice gap",evidence:{source:"practice"},
  approved_by:null,
};
const assigned=new Set(["unit-active","unit-future"]);
const now=new Date("2026-07-29T12:00:00Z");

describe("next-target priority",()=>{
  it("selects an active-unit skill gap before every other target",()=>{
    const result=selectNextTarget([
      {...base,id:"overdue",unit_id:"unit-future",target_date:"2026-07-01"},
      {...base,id:"active-gap"},
    ],assigned,"unit-active",now);
    expect(result?.id).toBe("active-gap");
  });

  it("then selects an overdue approved target",()=>{
    const result=selectNextTarget([
      {...base,id:"retrieval",unit_id:"unit-future",reason:"Retrieval practice"},
      {...base,id:"overdue",unit_id:"unit-future",skill_id:null,target_date:"2026-07-01"},
    ],assigned,"unit-active",now);
    expect(result?.id).toBe("overdue");
  });

  it("then selects recently taught retrieval before teacher priority",()=>{
    const result=selectNextTarget([
      {...base,id:"teacher",unit_id:"unit-future",approved_by:"teacher"},
      {...base,id:"retrieval",unit_id:"unit-future",reason:"Delayed retrieval"},
    ],assigned,"unit-active",now);
    expect(result?.id).toBe("retrieval");
  });

  it("allows a future unit only when deliberately scheduled",()=>{
    expect(selectNextTarget([
      {...base,id:"future",unit_id:"unit-future",skill_id:null,evidence:{deliberately_scheduled:true}},
    ],assigned,"unit-active",now)?.id).toBe("future");
    expect(selectNextTarget([
      {...base,id:"unscheduled",unit_id:"unit-future",skill_id:null},
    ],assigned,"unit-active",now)).toBeUndefined();
  });

  it("never selects another class or unit",()=>{
    expect(selectNextTarget([
      {...base,id:"wrong-unit",unit_id:"unit-other"},
    ],assigned,"unit-active",now)).toBeUndefined();
  });
});

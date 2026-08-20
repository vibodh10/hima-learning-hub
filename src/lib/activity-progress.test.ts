import {describe,expect,it} from "vitest";
import {summariseActivityProgress,type CountableActivity} from "./activity-progress";

const base:CountableActivity={
  id:"a",published:true,archived:false,lockedFuture:false,
  inAssignedScope:true,testMode:false,required:true,completed:false,
};

describe("authoritative activity progress",()=>{
  it("counts assigned, completed, required, optional and percentage once",()=>{
    expect(summariseActivityProgress([
      {...base,id:"a",completed:true},
      {...base,id:"b",required:false},
    ])).toEqual({assigned:2,completed:1,required:1,optional:1,percentage:50});
  });

  it.each([
    ["unpublished",{published:false}],
    ["archived",{archived:true}],
    ["locked future",{lockedFuture:true}],
    ["another class or unit",{inAssignedScope:false}],
    ["test mode",{testMode:true}],
  ] as const)("does not count %s activities",(_,change)=>{
    expect(summariseActivityProgress([{...base,...change}]).assigned).toBe(0);
  });

  it("deduplicates activities and treats any completed real attempt as complete",()=>{
    expect(summariseActivityProgress([
      {...base,id:"same",completed:false},
      {...base,id:"same",completed:true},
    ])).toEqual({assigned:1,completed:1,required:1,optional:0,percentage:100});
  });

  it("returns a stable zero percentage when nothing is assigned",()=>{
    expect(summariseActivityProgress([])).toEqual({assigned:0,completed:0,required:0,optional:0,percentage:0});
  });
});

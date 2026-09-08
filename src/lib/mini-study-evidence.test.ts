import {describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {allStudyRows} from "./mini-study-evidence";

describe("complete mini-study evidence",()=>{
 it("reads beyond the first page without losing records",async()=>{
  const values=Array.from({length:451},(_,id)=>({id}));
  const query=vi.fn(async(from:number,to:number)=>({data:values.slice(from,to+1),count:values.length,error:null}));
  expect(await allStudyRows(query)).toEqual(values);
  expect(query).toHaveBeenCalledTimes(3);
 });
 it("rejects errors, silent truncation and changing result counts",async()=>{
  for(const page of [{data:null,count:0,error:"offline"},{data:[],count:1,error:null},{data:[],count:null,error:null},{data:[],count:10001,error:null}]){
    await expect(allStudyRows(async()=>page)).rejects.toThrow();
  }
  const query=vi.fn().mockResolvedValueOnce({data:Array(200).fill(1),count:201,error:null}).mockResolvedValueOnce({data:[1],count:202,error:null});
  await expect(allStudyRows(query)).rejects.toThrow("changed");
 });
 it("accepts genuinely empty evidence",async()=>{
  expect(await allStudyRows(async()=>({data:[],count:0,error:null}))).toEqual([]);
 });
});

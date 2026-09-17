import {beforeEach,describe,expect,it,vi} from "vitest";
import {GET} from "./route";
const mocks=vi.hoisted(()=>({profile:vi.fn(),rpc:vi.fn(),from:vi.fn(),evidence:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSessionProfile:mocks.profile}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({rpc:mocks.rpc,from:mocks.from})}));
vi.mock("@/lib/mini-study-evidence",()=>({loadMiniStudyEvidence:mocks.evidence}));
const id="11111111-1111-4111-8111-111111111111";
const request=()=>GET(new Request("https://example.test/report"),{params:Promise.resolve({id})});
beforeEach(()=>{
 vi.clearAllMocks();mocks.profile.mockResolvedValue({role:"teacher"});mocks.rpc.mockResolvedValue({data:true,error:null});
 mocks.from.mockImplementation((table:string)=>{
  const result=table==="classes"?{data:{name:"Group"},error:null}:{data:[{unit_id:"unit-2"},{unit_id:"unit-6"}],error:null};
  const query:Record<string,ReturnType<typeof vi.fn>>={};
  for(const method of ["select","eq","is","order"])query[method]=vi.fn(()=>query);
  query.maybeSingle=vi.fn().mockResolvedValue(result);
  query.then=vi.fn((resolve:(value:unknown)=>unknown)=>Promise.resolve(result).then(resolve));
  return query;
 });
 mocks.evidence.mockResolvedValue({learners:[],records:[],baselines:[]});
});
describe("private short-study downloads",()=>{
 it("denies signed-out and student requests before database access",async()=>{
  for(const [actor,status] of [[null,401],[{role:"student"},403]] as const){mocks.profile.mockResolvedValue(actor);expect((await request()).status).toBe(status);}
  expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.evidence).not.toHaveBeenCalled();
 });
 it("checks the exact class permission before reading its records",async()=>{
  mocks.rpc.mockResolvedValue({data:false,error:null});
  expect((await request()).status).toBe(404);expect(mocks.from).not.toHaveBeenCalled();expect(mocks.evidence).not.toHaveBeenCalled();
 });
 it("returns a private uncached spreadsheet across all authorised active units",async()=>{
  const response=await request();
  expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-disposition")).toContain("attachment");
  expect(mocks.evidence).toHaveBeenCalledWith(expect.anything(),id,["unit-2","unit-6"]);
  expect(await response.text()).toContain("not assignment grades");
 });
 it("does not download partial evidence after a read failure",async()=>{
  mocks.evidence.mockRejectedValue(new Error("incomplete"));
  const response=await request();expect(response.status).toBe(503);expect(response.headers.get("content-disposition")).toBeNull();
 });
});

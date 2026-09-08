import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import MiniStudyGroupPage from "./mini-study-group-page";

const mocks=vi.hoisted(()=>({role:vi.fn(),rpc:vi.fn(),from:vi.fn(),tables:{} as Record<string,{data:unknown;error:{message:string}|null}>,queries:{} as Record<string,Record<string,ReturnType<typeof vi.fn>>>}));
vi.mock("@/lib/auth",()=>({requireRole:mocks.role}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({rpc:mocks.rpc,from:mocks.from})}));
vi.mock("next/navigation",()=>({notFound:()=>{throw new Error("not-found");}}));
vi.mock("./app-header",()=>({AppHeader:()=>null}));
vi.mock("server-only",()=>({}));
afterEach(cleanup);
beforeEach(()=>{
 vi.clearAllMocks();mocks.queries={};
 mocks.role.mockResolvedValue({role:"teacher",display_name:"Staff"});mocks.rpc.mockResolvedValue({data:true,error:null});
 mocks.tables={
  classes:{data:{name:"Assigned group",active_unit_id:"unit-6",published:true},error:null},
  enrolments:{data:[{student_id:"learner-a",user_profiles:{display_name:"Learner A"}}],error:null},
  mini_study_sessions:{data:[],error:null},
  unit_starting_point_baselines:{data:[{learner_id:"learner-a",correct_count:16,question_count:21,completed_at:"2026-09-08T09:00:00Z"}],error:null},
 };
 mocks.from.mockImplementation((table:string)=>{
  const query:Record<string,ReturnType<typeof vi.fn>>={};
  for(const method of ["select","eq","is","in","neq","maybeSingle","order","range"])query[method]=vi.fn(()=>query);
  query.then=vi.fn((resolve:(value:unknown)=>unknown)=>Promise.resolve({...mocks.tables[table],count:Array.isArray(mocks.tables[table].data)?mocks.tables[table].data.length:0}).then(resolve));
  mocks.queries[table]=query;return query;
 });
});
describe("current teacher group view",()=>{
 it("checks class permission before reading any learner records",async()=>{
  mocks.rpc.mockResolvedValue({data:false,error:null});
  await expect(MiniStudyGroupPage({params:Promise.resolve({id:"other-class"})})).rejects.toThrow("not-found");
  expect(mocks.from).not.toHaveBeenCalled();
 });
 it("scopes evidence to the active group, unit and enrolled learners",async()=>{
  render(await MiniStudyGroupPage({params:Promise.resolve({id:"class-a"})}));
  expect(mocks.queries.mini_study_sessions.eq).toHaveBeenCalledWith("class_id","class-a");
  expect(mocks.queries.mini_study_sessions.eq).toHaveBeenCalledWith("unit_id","unit-6");
  expect(mocks.queries.unit_starting_point_baselines.in).toHaveBeenCalledWith("learner_id",["learner-a"]);
  expect(mocks.queries.enrolments.is).toHaveBeenCalledWith("archived_at",null);
  expect(screen.getByText(/Existing full-unit starting point: 16 of 21/)).toBeInTheDocument();
  expect(screen.queryByText(/weekly|catch-up alert/i)).not.toBeInTheDocument();
  expect(screen.getByRole("link",{name:"Download short-study spreadsheet"})).toHaveAttribute("href","/api/reports/classes/class-a/mini-study");
 });
 it("shows a retrieval error instead of fabricated zero progress",async()=>{
  mocks.tables.mini_study_sessions={data:null,error:{message:"offline"}};
  render(await MiniStudyGroupPage({params:Promise.resolve({id:"class-a"})}));
  expect(screen.getByRole("heading",{name:"Records could not be loaded"})).toBeInTheDocument();
  expect(screen.queryByText("No daily check recorded yet.")).not.toBeInTheDocument();
 });
 it("gives an unpublished group one clear setup action",async()=>{
  mocks.tables.classes={data:{name:"New group",active_unit_id:null,published:false},error:null};
  render(await MiniStudyGroupPage({params:Promise.resolve({id:"class-a"})}));
  expect(screen.getByRole("link",{name:"Set up group →"})).toHaveAttribute("href","/teacher/classes/class-a/settings");
  expect(mocks.queries.mini_study_sessions).toBeUndefined();
 });
});

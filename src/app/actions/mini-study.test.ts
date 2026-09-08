import {beforeEach,describe,expect,it,vi} from "vitest";
import {checkMiniStudy,finishMiniStudy} from "./mini-study";
import {unit6StudyBaseline} from "@/lib/mini-study-content";

const mocks=vi.hoisted(()=>({profile:vi.fn(),session:vi.fn(),rpc:vi.fn(),admin:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSessionProfile:mocks.profile}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:mocks.admin}));
vi.mock("@/lib/mini-study-server",()=>({studySessionFor:mocks.session,openStudySession:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
const id="11111111-1111-4111-8111-111111111111";
const responses=unit6StudyBaseline.map(q=>({questionId:q.id,answer:q.answer}));
beforeEach(()=>{
 vi.clearAllMocks();mocks.profile.mockResolvedValue({id:"authenticated-learner",role:"student"});
 mocks.admin.mockReturnValue({rpc:mocks.rpc});
 mocks.session.mockResolvedValue({id,question_keys:unit6StudyBaseline});
 mocks.rpc.mockResolvedValue({data:{correct:4,total:4,feedback:[]},error:null});
});
describe("authenticated short-study actions",()=>{
 it("denies signed-out and teacher submissions without touching privileged storage",async()=>{
  for(const actor of [null,{id:"teacher",role:"teacher"}]){
   mocks.profile.mockResolvedValue(actor);
   expect((await checkMiniStudy(id,responses)).ok).toBe(false);
   expect((await finishMiniStudy(id)).ok).toBe(false);
  }
  expect(mocks.admin).not.toHaveBeenCalled();expect(mocks.session).not.toHaveBeenCalled();
 });
 it("uses authenticated identity and computes marks from the saved server key",async()=>{
  const result=await checkMiniStudy(id,responses);
  expect(result.ok).toBe(true);
  expect(mocks.session).toHaveBeenCalledWith("authenticated-learner",id);
  expect(mocks.rpc).toHaveBeenCalledWith("check_mini_study",expect.objectContaining({learner_uuid:"authenticated-learner",session_uuid:id,grade_value:expect.objectContaining({correct:4,total:4})}));
 });
 it("rejects forged scores, missing responses and unknown sessions",async()=>{
  expect((await checkMiniStudy(id,{responses,correct:999,xp:999})).ok).toBe(false);
  expect((await checkMiniStudy(id,responses.slice(1))).ok).toBe(false);
  mocks.session.mockResolvedValue(null);
  expect((await checkMiniStudy(id,responses)).ok).toBe(false);
  expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it("does not reveal grading feedback when the database rejects the assignment",async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{message:"unit_not_assigned"}});
  const result=await checkMiniStudy(id,responses);
  expect(result.ok).toBe(false);expect(result).not.toHaveProperty("grade");
 });
 it("does not award XP in client code; uses only the authoritative reward receipt",async()=>{
  mocks.rpc.mockResolvedValue({data:{xp:20,badge:"First small step",nextOn:"2026-09-09"},error:null});
  expect(await finishMiniStudy(id)).toEqual({ok:true,reward:{xp:20,badge:"First small step",nextOn:"2026-09-09"}});
  expect(mocks.rpc).toHaveBeenCalledWith("finish_mini_study",{learner_uuid:"authenticated-learner",session_uuid:id});
 });
 it("returns a recoverable error when storage fails",async()=>{
  mocks.rpc.mockRejectedValue(new Error("offline"));
  expect((await checkMiniStudy(id,responses)).ok).toBe(false);expect((await finishMiniStudy(id)).ok).toBe(false);
 });
});

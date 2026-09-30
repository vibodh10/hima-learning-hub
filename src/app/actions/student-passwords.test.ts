import {beforeEach, describe, expect, it, vi} from "vitest";
const mocks=vi.hoisted(()=>({role:vi.fn(),admin:vi.fn()}));
vi.mock("@/lib/auth",()=>({requireRole:mocks.role}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:mocks.admin}));
import {setStudentPassword} from "./student-passwords";
const id="123e4567-e89b-42d3-a456-426614174000";
beforeEach(()=>vi.clearAllMocks());
function setup(overrides: Record<string,unknown>={}) {
  mocks.role.mockResolvedValue({id:"admin",organisation_id:"college"});
  const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),is:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{id,display_name:"Test learner",role:"student",organisation_id:"college",archived_at:null,...overrides},error:null})};
  const insert=vi.fn().mockResolvedValue({error:null});
  const getUserById=vi.fn().mockResolvedValue({data:{user:{id,email:"learner@example.com",email_confirmed_at:"2026-01-01"}},error:null});
  const updateUserById=vi.fn().mockResolvedValue({data:{user:{id}},error:null});
  mocks.admin.mockReturnValue({from:(name:string)=>name==="audit_logs"?{insert}:q,auth:{admin:{getUserById,updateUserById}}});
  const form=new FormData();
  Object.entries({studentId:id,email:"learner@example.com",password:"A-test-password-174",confirmPassword:"A-test-password-174",identityConfirmed:"on"}).forEach(([k,v])=>form.set(k,v));
  return {q,insert,getUserById,updateUserById,form};
}
describe("administrator student password recovery",()=>{
  it("requires administrator access before constructing a privileged client",async()=>{
    const s=setup();mocks.role.mockRejectedValue(new Error("forbidden"));
    await expect(setStudentPassword({},s.form)).rejects.toThrow("forbidden");
    expect(mocks.role).toHaveBeenCalledWith("administrator");expect(mocks.admin).not.toHaveBeenCalled();
  });
  it.each([{role:"teacher"},{organisation_id:"another-college"},{archived_at:"2026-01-01"}])("rejects an out of scope profile %j",async profile=>{
    const s=setup(profile);expect((await setStudentPassword({},s.form)).ok).not.toBe(true);
    expect(s.updateUserById).not.toHaveBeenCalled();expect(s.getUserById).not.toHaveBeenCalled();
  });
  it("requires the original account email and identity confirmation",async()=>{
    const s=setup();s.form.set("email","wrong@example.com");
    expect((await setStudentPassword({},s.form)).ok).not.toBe(true);expect(s.updateUserById).not.toHaveBeenCalled();
    s.form.delete("identityConfirmed");expect((await setStudentPassword({},s.form)).ok).not.toBe(true);
  });
  it("requires matching strong passwords and a recorded audit request",async()=>{
    const s=setup();s.form.set("confirmPassword","different");
    expect((await setStudentPassword({},s.form)).ok).not.toBe(true);expect(s.updateUserById).not.toHaveBeenCalled();
    s.form.set("confirmPassword","A-test-password-174");s.insert.mockResolvedValue({error:{message:"unavailable"}});
    expect((await setStudentPassword({},s.form)).ok).not.toBe(true);expect(s.updateUserById).not.toHaveBeenCalled();
  });
  it("only changes the existing password and never puts it in the audit or response",async()=>{
    const s=setup();const result=await setStudentPassword({},s.form);
    expect(result.ok).toBe(true);expect(s.updateUserById).toHaveBeenCalledExactlyOnceWith(id,{password:"A-test-password-174"});
    expect(s.q.eq).toHaveBeenCalledWith("organisation_id","college");
    expect(JSON.stringify(s.insert.mock.calls)).not.toContain("A-test-password-174");
    expect(JSON.stringify(result)).not.toContain("A-test-password-174");
  });
  it("does not treat an authentication failure as success",async()=>{
    const s=setup();s.updateUserById.mockResolvedValue({data:{user:null},error:{code:"weak_password"}});
    expect((await setStudentPassword({},s.form)).ok).not.toBe(true);
  });
  it("does not bypass unconfirmed or suspended account restrictions",async()=>{
    const s=setup();s.getUserById.mockResolvedValue({data:{user:{id,email:"learner@example.com",email_confirmed_at:null}},error:null});
    expect((await setStudentPassword({},s.form)).ok).not.toBe(true);expect(s.updateUserById).not.toHaveBeenCalled();
  });
});

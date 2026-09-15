import {beforeEach,describe,expect,it,vi} from "vitest";
import AssignmentOnePage from "./page";
import AssignmentOnePreview from "../preview/assignment-one/page";
const mocks=vi.hoisted(()=>({role:vi.fn(),access:vi.fn()}));
vi.mock("@/lib/auth",()=>({requireRole:mocks.role}));
vi.mock("@/lib/curriculum-access",()=>({requireCurriculumUnitAccess:mocks.access}));
vi.mock("next/navigation",()=>({notFound:()=>{throw new Error("not-found");}}));
beforeEach(()=>{vi.clearAllMocks();vi.unstubAllEnvs();mocks.role.mockResolvedValue({role:"student"});mocks.access.mockResolvedValue({role:"student"});});
describe("assignment guide entry",()=>{
  it("requires authentication and assigned Unit 6 access before rendering",async()=>{
    mocks.role.mockRejectedValueOnce(new Error("login"));
    await expect(AssignmentOnePage()).rejects.toThrow("login");
    expect(mocks.access).not.toHaveBeenCalled();
    mocks.access.mockRejectedValueOnce(new Error("not-assigned"));
    await expect(AssignmentOnePage()).rejects.toThrow("not-assigned");
    expect(mocks.access).toHaveBeenCalledWith("6");
    expect(await AssignmentOnePage()).toBeTruthy();
  });
  it("makes the unauthenticated preview development-only",()=>{
    vi.stubEnv("NODE_ENV","production");
    expect(()=>AssignmentOnePreview()).toThrow("not-found");
    vi.stubEnv("NODE_ENV","development");
    expect(AssignmentOnePreview()).toBeTruthy();
    vi.unstubAllEnvs();
  });
});

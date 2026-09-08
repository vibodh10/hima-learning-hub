import {beforeEach,describe,expect,it,vi} from "vitest";
import ProgressPage from "./progress/page";
import PortfolioPage from "./portfolio/page";
import LearningLayout from "./learn/layout";
import CurriculumLayout from "./curriculum/layout";
const mocks=vi.hoisted(()=>({role:vi.fn(),redirect:vi.fn((path:string)=>{throw new Error(`redirect:${path}`);})}));
vi.mock("@/lib/auth",()=>({requireRole:mocks.role}));
vi.mock("next/navigation",()=>({redirect:mocks.redirect}));
vi.mock("@/components/app-header",()=>({AppHeader:()=>null}));
beforeEach(()=>{vi.clearAllMocks();mocks.role.mockResolvedValue({role:"student",display_name:"Learner"});});
describe("simple student entry points",()=>{
 it("redirects bookmarked progress and portfolio pages to the assigned step",async()=>{
  for(const page of [ProgressPage,PortfolioPage])await expect(page()).rejects.toThrow("redirect:/study");
  expect(mocks.role).toHaveBeenCalledWith("student");
 });
 it("redirects students away from both legacy resource libraries",async()=>{
  for(const layout of [LearningLayout,CurriculumLayout])await expect(layout({children:"old resource"})).rejects.toThrow("redirect:/study");
 });
 it("preserves staff access to teaching resources",async()=>{
  for(const role of ["teacher","administrator"]){
   mocks.role.mockResolvedValue({role,display_name:"Staff"});
   expect(await LearningLayout({children:"staff resource"})).toBe("staff resource");
   expect(await CurriculumLayout({children:"staff resource"})).toBeTruthy();
  }
  expect(mocks.redirect).not.toHaveBeenCalled();
 });
});

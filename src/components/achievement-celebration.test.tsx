import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {AchievementCelebration} from "./achievement-celebration";

const markSeen=vi.fn();
vi.mock("@/app/actions/learning",()=>({
  markBadgeNotificationsSeen:(ids:string[])=>markSeen(ids),
}));

function motionPreference(reduced:boolean){
  Object.defineProperty(window,"matchMedia",{configurable:true,value:()=>({
    matches:reduced,media:"(prefers-reduced-motion: reduce)",
    addEventListener:vi.fn(),removeEventListener:vi.fn(),
  })});
}

describe("achievement celebration",()=>{
  afterEach(cleanup);
  beforeEach(()=>{
    markSeen.mockReset();
    delete document.body.dataset.celebrationEffect;
  });

  it("uses a static celebration when reduced motion is enabled",async()=>{
    motionPreference(true);
    const{container}=render(<AchievementCelebration title="First Step" reason="Completed learning."/>);
    expect(await screen.findByText(/shown without animation/i)).toBeInTheDocument();
    expect(container.querySelector(".confetti-layer")).toBeNull();
  });

  it("animates confetti once for a standard new award",async()=>{
    motionPreference(false);
    const{container}=render(<AchievementCelebration title="First Step" reason="Completed learning."/>);
    await waitFor(()=>expect(container.querySelectorAll(".confetti-layer i")).toHaveLength(28));
  });

  it("applies the learner's equipped confetti effect",async()=>{
    motionPreference(false);
    document.body.dataset.celebrationEffect="confetti";
    const{container}=render(<AchievementCelebration title="Python Explorer" reason="Mastery demonstrated."/>);
    expect(await screen.findByText(/Equipped Confetti celebration applied/i)).toBeInTheDocument();
    expect(container.querySelectorAll(".confetti-layer i")).toHaveLength(48);
  });

  it("marks a real notification seen on close but never marks a preview",()=>{
    motionPreference(true);
    const{rerender}=render(<AchievementCelebration title="First Step" reason="Completed learning." awardIds={["award-1"]}/>);
    fireEvent.click(screen.getByRole("button",{name:"Close"}));
    expect(markSeen).toHaveBeenCalledWith(["award-1"]);
    markSeen.mockReset();
    rerender(<AchievementCelebration title="Preview" reason="Sandbox." awardIds={["award-2"]} preview/>);
    fireEvent.click(screen.getByRole("button",{name:"Close"}));
    expect(markSeen).not.toHaveBeenCalled();
  });
});

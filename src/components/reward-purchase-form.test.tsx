import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyEquippedCosmetic, RewardPurchaseForm } from "./reward-purchase-form";

vi.mock("@/app/actions/learning", () => ({
  equipReward: vi.fn(),
  purchaseReward: vi.fn(),
}));

afterEach(() => {
  cleanup();
  delete document.body.dataset.theme;
  delete document.body.dataset.badgeFrame;
  delete document.body.dataset.celebrationEffect;
});

describe("reward purchase form", () => {
  it("makes immediate application clear before purchase", () => {
    render(<RewardPurchaseForm
      rewardId="67000000-0000-0000-0000-000000000001"
      price={40}
      owned={false}
      affordable
      preview={{ theme: "ocean" }}
    />);

    expect(screen.getByRole("button", { name: "Buy and apply for 40 coins" })).toBeVisible();
  });

  it("applies and removes every supported cosmetic attribute", () => {
    applyEquippedCosmetic("profile_theme", true, { theme: "ocean" });
    applyEquippedCosmetic("badge_frame", true, { frame: "python" });
    applyEquippedCosmetic("celebration_effect", true, { effect: "confetti" });

    expect(document.body).toHaveAttribute("data-theme", "ocean");
    expect(document.body).toHaveAttribute("data-badge-frame", "python");
    expect(document.body).toHaveAttribute("data-celebration-effect", "confetti");

    applyEquippedCosmetic("profile_theme", false, {});
    applyEquippedCosmetic("badge_frame", false, {});
    applyEquippedCosmetic("celebration_effect", false, {});

    expect(document.body).not.toHaveAttribute("data-theme");
    expect(document.body).not.toHaveAttribute("data-badge-frame");
    expect(document.body).not.toHaveAttribute("data-celebration-effect");
  });
});

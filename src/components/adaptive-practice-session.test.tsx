import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdaptivePracticeSession } from "./adaptive-practice-session";
import { unitByCode } from "@/lib/learning-catalog";
import type { SkillEvidence } from "@/lib/adaptive-workbook";

vi.mock("@/app/actions/atom-learning", () => ({ saveAtomAttempt: vi.fn() }));
afterEach(() => { cleanup(); localStorage.clear(); });
const unit = unitByCode("6")!;
const topic = unit.topics[0];
function diagnostic(correct: boolean): SkillEvidence[] {
  return Array.from({ length: 3 }, (_, i) => ({
    id: String(i), kind: "initial_diagnostic", unitCode: "6", topicCode: topic.code,
    skill: "website principles", difficulty: 3, correct, independent: true,
    hintsUsed: 0, recordedAt: new Date().toISOString(),
  }));
}
describe("topic-specific practice starting difficulty", () => {
  it("uses weak saved diagnostic evidence instead of a browser Challenge setting", () => {
    localStorage.setItem("test-progress", JSON.stringify({ level: "Challenge", topics: {} }));
    render(<AdaptivePracticeSession unit={unit} topic={topic} storageKey="test-progress" initialEvidence={{ evidence: diagnostic(false) }} />);
    expect(screen.getByText("Level 1")).toBeInTheDocument();
  });
  it("uses strong saved diagnostic evidence instead of a browser Support setting", () => {
    localStorage.setItem("test-progress", JSON.stringify({ level: "Support", topics: {} }));
    render(<AdaptivePracticeSession unit={unit} topic={topic} storageKey="test-progress" initialEvidence={{ evidence: diagnostic(true) }} />);
    expect(screen.getByText("Level 4")).toBeInTheDocument();
  });
  it("starts with support when the topic has no saved evidence", () => {
    render(<AdaptivePracticeSession unit={unit} topic={topic} storageKey="test-progress" />);
    expect(screen.getByText("Level 1")).toBeInTheDocument();
  });
});

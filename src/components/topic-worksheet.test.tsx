import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopicWorksheet } from "./topic-worksheet";

vi.mock("@/app/actions/worksheets", () => ({
  submitTopicWorksheet: vi.fn(),
}));

describe("topic worksheet catch-up guidance", () => {
  it("directs the learner to the learner-paced guide without video language", () => {
    render(<TopicWorksheet
      unitCode="4"
      topicCode="A1"
      topicTitle="Computational thinking"
      catchUp
      evidenceStage="learning"
    />);

    expect(screen.getByText(/Read the short guided explanation above at your own pace\./)).toBeInTheDocument();
    expect(screen.queryByText(/video|watch the short/i)).not.toBeInTheDocument();
  });
});

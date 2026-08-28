import {fireEvent,render,screen} from "@testing-library/react";
import {describe,expect,it} from "vitest";
import {teachingSequenceFor} from "@/lib/btec-teaching";
import {unitByCode} from "@/lib/learning-catalog";
import {TopicExplainer} from "./topic-explainer";

describe("short guided topic explanation",()=>{
  it("provides six learner-paced steps without video or autoplay controls",()=>{
    const unit=unitByCode("4")!,topic=unit.topics[0];
    render(<TopicExplainer topicTitle={topic.title} cards={teachingSequenceFor(unit,topic,"Core")}/>);
    expect(screen.getByText("Step 1 of 6 · What is it?")).toBeInTheDocument();
    expect(screen.getByText("Read all six steps")).toBeInTheDocument();
    expect(screen.queryByText(/video/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:/play|pause/i})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Next step"}));
    expect(screen.getByText("Step 2 of 6 · Why is it used?")).toBeInTheDocument();
  });
});

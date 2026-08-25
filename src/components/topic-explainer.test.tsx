import {fireEvent,render,screen} from "@testing-library/react";
import {describe,expect,it} from "vitest";
import {teachingSequenceFor} from "@/lib/btec-teaching";
import {unitByCode} from "@/lib/learning-catalog";
import {TopicExplainer} from "./topic-explainer";

describe("short topic visual explainer",()=>{
  it("provides six captioned scenes, manual controls and a transcript",()=>{
    const unit=unitByCode("4")!,topic=unit.topics[0];
    render(<TopicExplainer topicTitle={topic.title} cards={teachingSequenceFor(unit,topic,"Core")}/>);
    expect(screen.getByText("Scene 1 of 6 · What is it?")).toBeInTheDocument();
    expect(screen.getByText("Read the full transcript")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Next"}));
    expect(screen.getByText("Scene 2 of 6 · Why is it used?")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Play visual explainer"})).toBeInTheDocument();
  });
});

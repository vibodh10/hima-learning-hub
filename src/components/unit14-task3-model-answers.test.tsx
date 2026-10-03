import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,describe,expect,it} from "vitest";
import {Unit14Task3ModelAnswers} from "./unit14-task3-model-answers";
import {unit14Task3Models} from "@/lib/unit14-task3-models";
import {unit14Task3ScenarioDrills} from "@/lib/unit14-task3";
afterEach(cleanup);

describe("full Activity 3 worked answers",()=>{
  it("gives each existing sample a substantial, complete explained design",()=>{
    expect(unit14Task3Models).toHaveLength(3);
    expect(new Set(unit14Task3Models.map(model=>model.id)).size).toBe(3);
    for(const model of unit14Task3Models){
      expect(unit14Task3ScenarioDrills[model.drillIndex]).toBeTruthy();
      expect(model.rooms).toHaveLength(4);
      expect(model.data.length).toBeGreaterThanOrEqual(3);
      expect(model.journeys).toHaveLength(2);
      expect(model.network).toContain("Internet");
      expect(model.dfd).toContain("-->");
      expect([model.opening,model.networkExplanation,model.flowExplanation,...model.operation,...model.journeys,model.future].join(" ").split(/\s+/).length).toBeGreaterThan(400);
    }
  });
  it("opens one model at a time and changes the complete answer with its scenario",()=>{
    render(<Unit14Task3ModelAnswers/>);
    expect(screen.getByText(/not official Pearson answers or guaranteed 20\/20/)).toBeInTheDocument();
    const summary=screen.getByText("Read the full model answer: Two-site dental practice");
    fireEvent.click(summary);
    fireEvent.change(screen.getByLabelText("Model-answer scenario"),{target:{value:"hotel"}});
    expect(screen.getByText(unit14Task3ScenarioDrills[1])).toBeInTheDocument();
    expect(screen.getByText("Read the full model answer: Hotel booking and housekeeping").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByLabelText("Hotel booking and housekeeping: network diagram")).toBeInTheDocument();
    expect(screen.getByLabelText("Hotel booking and housekeeping: data flow diagram")).toBeInTheDocument();
    expect(screen.queryByText(unit14Task3Models[0].opening)).not.toBeInTheDocument();
  });
});

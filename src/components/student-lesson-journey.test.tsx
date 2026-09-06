import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentLessonJourney } from "./student-lesson-journey";

afterEach(cleanup);

describe("student lesson journey",()=>{
  it("reveals one lesson step at a time",async()=>{
    window.scrollTo=vi.fn();
    const user=userEvent.setup();
    render(<StudentLessonJourney
      lessonId="lesson"
      remember="Use meaningful names."
      objectives={["Explain a variable"]}
      screens={[{id:"screen",title:"Variables",body:"A variable stores a value.",example:null,codeSample:null,definition:null,commonMistake:null,rememberText:null}]}
      examples={[]}
      activities={[{id:"activity",title:"Try variables",label:"Guided practice",pathway:"Core",instructions:"Answer the questions.",minutes:5,questionCount:2,required:true,status:"Available",open:true}]}
      reflection={null}
    />);

    expect(screen.getByRole("heading",{name:"Use meaningful names."})).toBeVisible();
    expect(screen.queryByRole("heading",{name:"Variables"})).not.toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:/Start the short lesson/}));
    expect(screen.getByRole("heading",{name:"Variables"})).toBeVisible();
    expect(screen.queryByRole("heading",{name:"Try variables"})).not.toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:/Continue/}));
    expect(screen.getByRole("heading",{name:"Try variables"})).toBeVisible();
    expect(screen.getByRole("link",{name:/Open this activity/})).toHaveAttribute("href","/learn/lesson/activities/activity");
  });
});

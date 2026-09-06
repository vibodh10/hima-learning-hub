import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/learning",()=>({submitPractice:vi.fn()}));

import { PracticeForm, type PracticeQuestion } from "./practice-form";

afterEach(cleanup);

const questions:PracticeQuestion[]=[
  {id:"one",kind:"single_choice",question_text:"First question?",marks:1,question_options:[{id:"a",option_text:"First answer",sort_order:1}]},
  {id:"two",kind:"true_false",question_text:"Second question?",marks:1,question_options:[]},
];

describe("student practice form",()=>{
  it("shows one step at a time and requires an answer before moving on",async()=>{
    window.scrollTo=vi.fn();
    const user=userEvent.setup();
    render(<PracticeForm activityId="activity" questions={questions}/>);

    expect(screen.getByRole("heading",{name:"How confident do you feel?"})).toBeVisible();
    expect(screen.getByText("First question?")).not.toBeVisible();
    await user.click(screen.getByRole("button",{name:/Continue to question 1/}));
    expect(screen.getByText("First question?")).toBeVisible();
    expect(screen.getByText("Second question?")).not.toBeVisible();

    await user.click(screen.getByRole("button",{name:/Save answer and continue/}));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose or write an answer");
    await user.click(screen.getByRole("radio",{name:"First answer"}));
    await user.click(screen.getByRole("button",{name:/Save answer and continue/}));
    expect(screen.getByText("Second question?")).toBeVisible();
    expect(screen.getByText("First question?")).not.toBeVisible();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ClassSettingsForm } from "./class-forms";
vi.mock("@/app/actions/learning", () => ({ configureClass: vi.fn(async () => ({ok:true,message:"Saved"})) }));
afterEach(cleanup);
const props = {
  classData: {id:"class",name:"Website group",course_id:"course",academic_period_id:"term",active_unit_id:null,starts_on:null,ends_on:null,weekly_learning_day:1,weekly_learning_days:[1],published:true},
  courses:[{id:"course",title:"BTEC IT"}],
  periods:[{id:"term",name:"Autumn",kind:"term",academic_years:{name:"2026"}}],
  units:[{id:"u6",course_id:"course",code:"6",title:"Website Development",kind:"unit",initial_teaching:false},{id:"u1",course_id:"course",code:"1",title:"IT Systems",kind:"unit",initial_teaching:false}],
  selectedUnitIds:[],
};
it("shows one setup stage and only selected units in the final focus list", async () => {
  const user=userEvent.setup();
  render(<ClassSettingsForm {...props}/>);
  expect(screen.getByLabelText("Programme")).toBeVisible();
  expect(screen.queryByRole("checkbox",{name:/Unit 6/})).not.toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Continue"}));
  expect(screen.getByLabelText("Programme")).not.toBeVisible();
  await user.click(screen.getByRole("button",{name:"Continue"}));
  expect(screen.getByRole("alert")).toHaveTextContent("Select at least one unit");
  await user.click(screen.getByRole("checkbox",{name:/Unit 6/}));
  await user.click(screen.getByRole("button",{name:"Continue"}));
  expect(screen.getByLabelText("Unit students should start with")).toHaveValue("u6");
  expect(screen.queryByRole("option",{name:/1 · IT Systems/})).not.toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Back"}));
  expect(screen.getByRole("checkbox",{name:/Unit 6/})).toBeChecked();
});

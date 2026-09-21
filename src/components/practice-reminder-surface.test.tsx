import {act,cleanup,render,screen} from "@testing-library/react";
import {afterEach,expect,it} from "vitest";
import {PracticeReminderSurface} from "./practice-reminder-surface";
afterEach(cleanup);
it("clears the red surface only when completed practice is confirmed",()=>{
 const {container}=render(<PracticeReminderSurface due><p>Practice</p></PracticeReminderSurface>);
 expect(container.firstChild).toHaveClass("practice-overdue");
 act(()=>window.dispatchEvent(new Event("required-practice-completed")));
 expect(container.firstChild).not.toHaveClass("practice-overdue");
 expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

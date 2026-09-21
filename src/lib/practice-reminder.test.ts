import {expect,it} from "vitest";
import {practiceDueSince} from "./practice-reminder";
it("flags missed scheduled practice and clears after a completion",()=>{
 expect(practiceDueSince("2026-09-22",[1,2],"2026-09-01",null,"2026-09-10",null)).toBe("2026-09-21");
 expect(practiceDueSince("2026-09-22",[1,2],"2026-09-01",null,"2026-09-10","2026-09-22")).toBeNull();
 expect(practiceDueSince("2026-09-22",[1,2],null,null,"2026-09-21",null)).toBeNull();
 expect(practiceDueSince("2026-09-22",[1,2],null,"2026-09-20","2026-09-10",null)).toBeNull();
});

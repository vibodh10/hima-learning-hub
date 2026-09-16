import {act,cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {TimedStartingPoint} from "./timed-starting-point";
import {startingPointQuestions} from "@/lib/starting-point";
import {publicStudyQuestions,gradeStudy} from "@/lib/mini-study";
afterEach(()=>{cleanup();vi.useRealTimers();sessionStorage.clear();});
it("advances all ten questions, saves timeouts and shows review without repeating",async()=>{
 vi.useFakeTimers();const check=vi.fn(async(_id:string,input:import("@/lib/mini-study").StudyResponse[])=>({ok:true as const,grade:gradeStudy(startingPointQuestions,input)!}));
 render(<TimedStartingPoint card={{sessionId:"timer-test",kind:"baseline",title:"Start",unitTitle:"IT",lines:[],example:"",support:"",secondsPerQuestion:5,questions:publicStudyQuestions(startingPointQuestions,"test")}} check={check}/>);
 fireEvent.click(screen.getByText("Start timed check"));
 for(let i=0;i<10;i++)await act(async()=>{vi.advanceTimersByTime(5000);});
 expect(check).toHaveBeenCalledTimes(1);
 const answers=check.mock.calls[0][1];expect(new Set(answers.map((a:{questionId:string})=>a.questionId)).size).toBe(10);
 expect(screen.getByText(/10 timed out/)).toBeInTheDocument();
});


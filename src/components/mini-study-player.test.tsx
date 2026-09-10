import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {MiniStudyHome,MiniStudyPlayer,StudyDone} from "./mini-study-player";
import {beginMiniStudy} from "@/app/actions/mini-study";
import {gradeStudy,publicStudyQuestions,type StudyCard} from "@/lib/mini-study";
import {unit6StudyLessons} from "@/lib/mini-study-content";

vi.mock("@/app/actions/mini-study",()=>({beginMiniStudy:vi.fn(),checkMiniStudy:vi.fn(),finishMiniStudy:vi.fn()}));
afterEach(cleanup);
const lesson=unit6StudyLessons[0];
function card():StudyCard {return {sessionId:"test-session",kind:"daily",title:lesson.title,unitTitle:"Website Development",lines:lesson.lines,example:lesson.example,support:lesson.support,questions:publicStudyQuestions(lesson.questions,"test-session")};}

describe("one-step student experience",()=>{
 it("keeps stopping optional and opens another assigned lesson only on request",async()=>{
  vi.mocked(beginMiniStudy).mockClear();
  vi.mocked(beginMiniStudy).mockResolvedValueOnce({status:"active",card:card(),grade:null});
  render(<StudyDone reward={{xp:20,badge:null,nextOn:"2026-09-09"}}/>);
  expect(screen.getByRole("heading",{name:"You're done for today"})).toBeInTheDocument();
  expect(beginMiniStudy).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Do another lesson"}));
  expect(await screen.findByRole("heading",{name:lesson.title})).toBeInTheDocument();
  expect(beginMiniStudy).toHaveBeenCalledWith(true);
 });
 it("keeps the completion receipt and retry button if opening an extra lesson fails",async()=>{
  vi.mocked(beginMiniStudy).mockRejectedValueOnce(new Error("offline"));
  render(<StudyDone reward={{xp:20,badge:null,nextOn:"2026-09-09"}}/>);
  fireEvent.click(screen.getByRole("button",{name:"Do another lesson"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("completed step is saved");
  expect(screen.getByText("+20 XP")).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Do another lesson"})).toBeEnabled();
 });
 it("offers a safe retry if the connection fails while opening a step",async()=>{
  vi.mocked(beginMiniStudy).mockRejectedValueOnce(new Error("offline"));
  render(<MiniStudyHome initial={{status:"ready",kind:"daily",unitTitle:"Website Development"}}/>);
  fireEvent.click(screen.getByRole("button",{name:"Start"}));
  expect(await screen.findByRole("status")).toHaveTextContent("connection was interrupted");
  expect(await screen.findByRole("button",{name:"Try again"})).toBeEnabled();
 });
 it("shows a short explanation first, not questions or progress panels",()=>{
  render(<MiniStudyPlayer card={card()}/>);
  expect(screen.getByRole("heading",{name:lesson.title})).toBeInTheDocument();
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  expect(screen.queryByText(/my progress|assignment upload/i)).not.toBeInTheDocument();
 });
 it("walks through one question at a time, reviews feedback then awards completion",async()=>{
  const check=vi.fn(async(_id,responses)=>({ok:true as const,grade:gradeStudy(lesson.questions,responses)!}));
  const finish=vi.fn(async()=>({ok:true as const,reward:{xp:20,badge:"First small step",nextOn:"2026-09-09"}}));
  const current=card();
  render(<MiniStudyPlayer card={current} check={check} finish={finish}/>);
  fireEvent.click(screen.getByRole("button",{name:"Try a short check"}));
  for(const question of current.questions){
   expect(screen.getAllByRole("heading",{level:1})).toHaveLength(1);
   if(question.kind==="choice") fireEvent.click(screen.getByRole("radio",{name:lesson.questions[0].options[0].text}));
   else for(const stem of question.stems??[])fireEvent.change(screen.getByLabelText(stem.text),{target:{value:(lesson.questions[1].answer as Record<string,string>)[stem.id]}});
   fireEvent.click(screen.getByRole("button",{name:/Continue|Check my answers/}));
  }
  expect(await screen.findByRole("heading",{name:"That's right"})).toBeInTheDocument();
  expect(finish).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button",{name:"Continue"}));
  fireEvent.click(screen.getByRole("button",{name:"Finish for today"}));
  expect(await screen.findByRole("heading",{name:"You're done for today"})).toBeInTheDocument();
  expect(screen.getByText("+20 XP")).toBeInTheDocument();
  expect(check).toHaveBeenCalledTimes(1);expect(finish).toHaveBeenCalledTimes(1);
 });
 it("does not let matching use the same meaning twice",()=>{
  const current=card();current.questions=[current.questions.find(q=>q.kind==="match")!];
  render(<MiniStudyPlayer card={current}/>);
  fireEvent.click(screen.getByRole("button",{name:"Try a short check"}));
  for(const select of screen.getAllByRole("combobox"))fireEvent.change(select,{target:{value:"o1"}});
  expect(screen.getByRole("button",{name:"Check my answers"})).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Each meaning belongs to one idea");
 });
 it("retains answers and offers a retry when saving fails",async()=>{
  const check=vi.fn().mockRejectedValue(new Error("offline"));
  const current=card();current.questions=[current.questions.find(q=>q.kind==="choice")!];
  render(<MiniStudyPlayer card={current} check={check}/>);
  fireEvent.click(screen.getByRole("button",{name:"Try a short check"}));
  fireEvent.click(screen.getByRole("radio",{name:lesson.questions[0].options[0].text}));
  fireEvent.click(screen.getByRole("button",{name:"Check my answers"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("They are still here");
  expect(screen.getByRole("radio",{name:lesson.questions[0].options[0].text})).toBeChecked();
 });
 it("resumes stored feedback without asking for answers or re-grading",()=>{
  const grade=gradeStudy(lesson.questions,lesson.questions.map(q=>({questionId:q.id,answer:q.answer})))!;
  render(<MiniStudyPlayer card={card()} initialGrade={grade}/>);
  expect(screen.getByRole("heading",{name:"That's right"})).toBeInTheDocument();
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
 });
 it("shows no fake XP or badge when no award was made",()=>{
  render(<StudyDone reward={{xp:0,badge:null,nextOn:"2026-09-09"}}/>);
  expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
  expect(screen.getByText("You can close the portal now.")).toBeInTheDocument();
 });
 it("reviews answers in the presented question order with the original prompt",()=>{
  const current=card();
  current.questions=[...publicStudyQuestions(lesson.questions,"order")].sort((a,b)=>a.kind==="match"?-1:b.kind==="match"?1:0);
  const grade=gradeStudy(lesson.questions,lesson.questions.map(q=>({questionId:q.id,answer:q.answer})))!;
  render(<MiniStudyPlayer card={current} initialGrade={grade}/>);
  expect(screen.getByText(current.questions[0].prompt)).toBeInTheDocument();
  expect(screen.queryByText(current.questions[1].prompt)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Continue"}));
  expect(screen.getByText(current.questions[1].prompt)).toBeInTheDocument();
 });
});

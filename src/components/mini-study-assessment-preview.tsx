import "server-only";
import {studyContentFor} from "@/lib/mini-study-content-expanded";
import {assessmentPreviewPlan,upcomingAssessmentWindows} from "@/lib/mini-study-assessment";
import {studyDay,type StudyQuestionKey} from "@/lib/mini-study";

function dateLabel(day:string){return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Europe/London"});}
function answerLabel(question:StudyQuestionKey){
  if(typeof question.answer==="string")return question.options.find(option=>option.id===question.answer)?.text??"Answer not found";
  return (question.stems??[]).map(stem=>{
    const option=question.options.find(value=>value.id===(question.answer as Record<string,string>)[stem.id]);
    return `${stem.text} → ${option?.text??"Answer not found"}`;
  }).join("; ");
}

export function MiniStudyAssessmentPreview({units}:{units:{code:string;title:string}[]}){
  const today=studyDay(new Date());
  const windows=upcomingAssessmentWindows(today,4);
  const next=windows[0];
  if(!next)return null;
  const previews=units.flatMap(unit=>{
    const content=studyContentFor(unit.code);
    if(!content)return [];
    const plan=assessmentPreviewPlan(next,unit.code,content.lessons);
    return plan?[{unit,plan}]:[];
  });
  if(!previews.length)return null;
  return <section className="card mt-5" aria-labelledby="upcoming-assessments-title">
    <p className="eyebrow">Teacher preview</p>
    <h1 id="upcoming-assessments-title" className="mt-2 text-2xl font-bold">Upcoming assessments</h1>
    <p className="mt-3">The next required formal check is <strong>{next.title}</strong>, available {dateLabel(next.start)} to {dateLabel(next.end)}. Students cannot replace it by completing Hima practice first. The questions below are visible only in the teacher view.</p>
    <div className="mt-4 flex flex-wrap gap-2 text-sm">{windows.map(window=><span key={`${window.kind}-${window.number}`} className="rounded-full border border-slate-300 px-3 py-1"><strong>{window.title}</strong> · {dateLabel(window.start)}–{dateLabel(window.end)}</span>)}</div>
    <div className="mt-5 grid gap-4">{previews.map(({unit,plan})=>{
      const skills=[...new Set(plan.questions.map(question=>question.skill))];
      return <details key={`${next.kind}-${next.number}-${unit.code}`} className="rounded-xl border border-slate-200 p-4" open={previews.length===1}>
        <summary className="cursor-pointer font-bold">Unit {unit.code}: {unit.title} · {plan.questions.length} questions</summary>
        <p className="mt-3"><strong>Skills/topics:</strong> {skills.map(skill=>skill.replaceAll("-"," ")).join(", ")}</p>
        <ol className="mt-4 space-y-4">{plan.questions.map((question,index)=><li key={question.id} className="rounded-lg bg-slate-50 p-4">
          <p className="font-semibold">{index+1}. {question.prompt}</p>
          {question.kind==="choice"&&<p className="mt-2 text-sm">Choices: {question.options.map(option=>option.text).join(" · ")}</p>}
          {question.kind==="match"&&<p className="mt-2 text-sm">Matching items: {(question.stems??[]).map(stem=>stem.text).join(" · ")}</p>}
          <p className="mt-2"><strong>Correct answer:</strong> {answerLabel(question)}</p>
          <p className="mt-1 text-sm">{question.explanation}</p>
        </li>)}</ol>
      </details>;
    })}</div>
    <p className="mt-4 text-sm">The student version shuffles question and answer order, keeps answer keys on the server, requires full screen, and records assessment-page integrity events separately for teacher review.</p>
  </section>;
}

"use client";

import {useState} from "react";
import {unit14Task3FinalChecklist,unit14Task3Lessons,unit14Task3QuestionFamilies,unit14Task3ScenarioDrills} from "@/lib/unit14-task3";

function rotate<T>(items:T[],amount:number){
  if(!items.length)return items;
  const offset=((amount%items.length)+items.length)%items.length;
  return [...items.slice(offset),...items.slice(0,offset)];
}

function NetworkExample(){
  return <figure className="rounded-2xl border border-slate-300 bg-white p-4">
    <figcaption className="font-bold">Example: physical/service network view</figcaption>
    <p className="mt-1 text-sm text-slate-600">The exact design can differ. The point is that every room has a traceable path to the services it needs.</p>
    <div className="mt-4 grid gap-3 text-center text-sm">
      <div className="mx-auto rounded-lg border-2 border-slate-700 px-4 py-2 font-bold">Internet / external service</div>
      <div aria-hidden="true" className="font-black">↓</div>
      <div className="mx-auto rounded-lg border-2 border-slate-700 px-4 py-2">Router / firewall edge</div>
      <div aria-hidden="true" className="font-black">↓</div>
      <div className="mx-auto rounded-lg border-2 border-slate-700 px-4 py-2">Core switch</div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-300 p-3"><strong>General office</strong><p>Desktops · printer · booking/payment software</p><p className="mt-2">↑ Ethernet</p></div>
        <div className="rounded-xl border border-slate-300 p-3"><strong>Secure service area</strong><p>Shared servers / data stores</p><p className="mt-2">↑ Ethernet</p></div>
        <div className="rounded-xl border border-slate-300 p-3"><strong>Workshop</strong><p>WAP → tablet/diagnostic devices</p><p className="mt-2">↑ Ethernet to WAP · Wi-Fi to devices</p></div>
      </div>
    </div>
  </figure>;
}

function DfdExample(){
  return <figure className="rounded-2xl border border-slate-300 bg-white p-4">
    <figcaption className="font-bold">Example: Level 0 data-flow view</figcaption>
    <p className="mt-1 text-sm text-slate-600">A DFD is about information movement and processing, not cables.</p>
    <div className="mt-4 grid gap-3 text-center text-sm md:grid-cols-[1fr_auto_1.3fr_auto_1fr] md:items-center">
      <div className="rounded-none border-2 border-slate-700 p-3"><strong>Customer</strong><p>external entity</p></div>
      <div className="font-bold">booking request →</div>
      <div className="rounded-full border-2 border-slate-700 p-4"><strong>1.0 Process booking</strong><p>process</p></div>
      <div className="font-bold">booking record →</div>
      <div className="border-x-4 border-slate-700 p-3"><strong>Bookings</strong><p>data store</p></div>
    </div>
    <p className="mt-3 text-center text-sm"><strong>Return flow:</strong> Process booking → booking confirmation → Customer.</p>
  </figure>;
}

function DataModelExample(){
  return <figure className="rounded-2xl border border-slate-300 bg-white p-4">
    <figcaption className="font-bold">Example: stored-data relationship view</figcaption>
    <p className="mt-1 text-sm text-slate-600">This is different from a DFD. It shows how records relate.</p>
    <div className="mt-4 grid gap-3 text-sm md:grid-cols-3 md:items-center">
      <div className="rounded-lg border-2 border-slate-700 p-3"><strong>Customer</strong><p>CustomerID · Name · Contact</p></div>
      <div className="text-center font-bold">1 → many</div>
      <div className="rounded-lg border-2 border-slate-700 p-3"><strong>Booking</strong><p>BookingID · CustomerID · Date · Status</p></div>
      <div className="rounded-lg border-2 border-slate-700 p-3"><strong>Vehicle / resource</strong><p>ResourceID · Status</p></div>
      <div className="text-center font-bold">1 → many</div>
      <div className="rounded-lg border-2 border-slate-700 p-3"><strong>Booking allocation</strong><p>BookingID · ResourceID</p></div>
    </div>
  </figure>;
}

export function Unit14Task3Practice(){
  const [lessonIndex,setLessonIndex]=useState(0);
  const [quizIndex,setQuizIndex]=useState(0);
  const [quizAnswer,setQuizAnswer]=useState("");
  const [quizChecked,setQuizChecked]=useState(false);
  const [matches,setMatches]=useState<Record<string,string>>({});
  const [matchesChecked,setMatchesChecked]=useState(false);
  const [scenarioIndex,setScenarioIndex]=useState(0);
  const [plan,setPlan]=useState("");
  const [showChecklist,setShowChecklist]=useState(false);
  const lesson=unit14Task3Lessons[lessonIndex];
  const quiz=lesson.quizzes[quizIndex%lesson.quizzes.length];
  const quizOptions=rotate(quiz.options,lessonIndex+quizIndex+1);
  const matchOptions=rotate(lesson.matching.map(item=>item.right),lessonIndex+2);
  const matchCorrect=lesson.matching.filter(item=>matches[item.left]===item.right).length;
  const allMatched=lesson.matching.every(item=>Boolean(matches[item.left]));

  function changeLesson(value:number){
    setLessonIndex(value);setQuizIndex(0);setQuizAnswer("");setQuizChecked(false);setMatches({});setMatchesChecked(false);
  }
  function nextQuiz(){setQuizIndex(value=>value+1);setQuizAnswer("");setQuizChecked(false);}

  return <section className="grid gap-6">
    <section className="mini-study-panel">
      <p className="mini-study-kicker">Wednesday group · Unit 14 · Activity 3 intensive</p>
      <h2 className="text-3xl font-bold">Task 3: IT service delivery solution · 20 marks</h2>
      <p className="mt-3">For now this practice stays on Activity 3. Work through the diagrams, hardware, data flows and room planning repeatedly, then use the written Activity 3 practice below.</p>
      <div className="mt-5 rounded-xl bg-amber-50 p-4"><strong>Do not memorise one finished diagram.</strong> The sector changes. Memorise the method, the symbols and the checks so you can rebuild the solution from any scenario.</div>
      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Task 3 lesson topics">{unit14Task3Lessons.map((item,index)=><button key={item.id} type="button" className={index===lessonIndex?"button":"button-secondary"} onClick={()=>changeLesson(index)}>{index+1}. {item.title}</button>)}</nav>
    </section>

    <section className="mini-study-panel">
      <p className="mini-study-kicker">Learn · {lessonIndex+1} of {unit14Task3Lessons.length}</p>
      <h2 className="text-2xl font-bold">{lesson.title}</h2>
      <p className="mt-2 font-semibold">{lesson.focus}</p>
      <ol className="mt-4 list-decimal space-y-2 pl-6">{lesson.learn.map(item=><li key={item}>{item}</li>)}</ol>
      <aside className="mini-study-example mt-5"><h3 className="font-bold">Memory shortcut</h3><p>{lesson.memory}</p></aside>
      <details className="mini-study-help mt-5"><summary>What might I be asked to do with this?</summary><ul className="mt-2 list-disc space-y-1 pl-6">{lesson.exam.map(item=><li key={item}>{item}</li>)}</ul></details>
    </section>

    <section className="mini-study-panel">
      <p className="mini-study-kicker">Diagram lab</p>
      <h2 className="text-2xl font-bold">Know which diagram you are drawing</h2>
      <div className="mt-4 grid gap-4"><NetworkExample/><DfdExample/><DataModelExample/></div>
      <p className="mt-4 text-sm"><strong>Quick distinction:</strong> network diagram = devices/locations/connections; DFD = information movement and processing; data model/ERD = stored records and relationships.</p>
    </section>

    <section className="mini-study-panel">
      <p className="mini-study-kicker">Retrieval practice</p>
      <h2 className="text-2xl font-bold">Quick question</h2>
      <p className="mt-3 font-semibold">{quiz.question}</p>
      <fieldset className="mini-study-options mt-4"><legend className="sr-only">Choose one answer</legend>{quizOptions.map(option=><label className="mini-study-option" key={option}><input type="radio" name={`task3-${lesson.id}-${quizIndex}`} checked={quizAnswer===option} onChange={()=>{setQuizAnswer(option);setQuizChecked(false);}}/><span>{option}</span></label>)}</fieldset>
      <div className="mt-4 flex flex-wrap gap-3"><button className="mini-study-primary" type="button" disabled={!quizAnswer} onClick={()=>setQuizChecked(true)}>Check answer</button>{quizChecked&&<button className="button-secondary" type="button" onClick={nextQuiz}>Another quick question</button>}</div>
      {quizChecked&&<div className={`mt-4 rounded-xl p-4 ${quizAnswer===quiz.answer?"bg-emerald-50":"bg-amber-50"}`} role="status"><strong>{quizAnswer===quiz.answer?"Correct. ":"Not yet. "}</strong>{quiz.explanation}{quizAnswer!==quiz.answer&&<p className="mt-2"><strong>Best answer:</strong> {quiz.answer}</p>}</div>}
    </section>

    <section className="mini-study-panel">
      <p className="mini-study-kicker">Matching pairs</p>
      <h2 className="text-2xl font-bold">Match each idea to its job</h2>
      <div className="mt-4 grid gap-3">{lesson.matching.map(item=><label key={item.left} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_1.3fr] md:items-center"><strong>{item.left}</strong><select className="input" value={matches[item.left]??""} onChange={event=>{setMatches(current=>({...current,[item.left]:event.target.value}));setMatchesChecked(false);}}><option value="">Choose the match</option>{matchOptions.map(option=><option key={option} value={option}>{option}</option>)}</select></label>)}</div>
      <div className="mt-4 flex flex-wrap gap-3"><button className="mini-study-primary" type="button" disabled={!allMatched} onClick={()=>setMatchesChecked(true)}>Check matching</button><button className="button-secondary" type="button" onClick={()=>{setMatches({});setMatchesChecked(false);}}>Reset pairs</button></div>
      {matchesChecked&&<p className="mt-4 rounded-xl bg-slate-50 p-4" role="status"><strong>{matchCorrect}/{lesson.matching.length} correct.</strong> {matchCorrect===lesson.matching.length?"Good. Try the next topic or repeat later without looking at your notes.":"Change the incorrect pairs and check again."}</p>}
    </section>

    <section className="mini-study-panel">
      <p className="mini-study-kicker">Unfamiliar scenario drill</p>
      <h2 className="text-2xl font-bold">Plan before you draw</h2>
      <p className="mt-3">{unit14Task3ScenarioDrills[scenarioIndex]}</p>
      <label className="mt-4 grid gap-2"><strong>My plan</strong><textarea className="input min-h-44 w-full" value={plan} onChange={event=>{setPlan(event.target.value);setShowChecklist(false);}} placeholder="Rooms/sites → roles/tasks → hardware/software → connections → data flows/stores → what I would annotate"/></label>
      <div className="mt-4 flex flex-wrap gap-3"><button className="mini-study-primary" type="button" disabled={plan.trim().length<20} onClick={()=>setShowChecklist(true)}>Show the 20-mark self-check</button><button className="button-secondary" type="button" onClick={()=>{setScenarioIndex(value=>(value+1)%unit14Task3ScenarioDrills.length);setPlan("");setShowChecklist(false);}}>Another scenario</button></div>
      {showChecklist&&<ul className="mt-5 list-disc space-y-2 rounded-xl bg-slate-50 p-5 pl-9">{unit14Task3FinalChecklist.map(item=><li key={item}>{item}</li>)}</ul>}
    </section>

    <section className="mini-study-panel">
      <p className="mini-study-kicker">Question bank</p>
      <h2 className="text-2xl font-bold">Task 3 question families to practise</h2>
      <p className="mt-2">These are practice families, not predictions of Pearson wording. If you can handle each type with an unfamiliar scenario, you are preparing for the same skills from different directions.</p>
      <ol className="mt-4 list-decimal space-y-2 pl-6">{unit14Task3QuestionFamilies.map(item=><li key={item}>{item}</li>)}</ol>
    </section>
  </section>;
}

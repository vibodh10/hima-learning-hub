"use client";

import {programmingSteps,programmingRequirements} from "@/lib/programming-assignment-one";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {assignmentOne,assignmentSchedule,assignmentSteps} from "@/lib/assignment-one";

export function AssignmentOneGuide({schedule,preview=false,unit="6"}:{schedule:ReturnType<typeof assignmentSchedule>;preview?:boolean;unit?:"4"|"6"}) {
  const steps=unit==="4"?programmingSteps:assignmentSteps;
  const [index,setIndex]=useState(schedule.current);
  const [answer,setAnswer]=useState<number|null>(null);
  const [checked,setChecked]=useState(false);
  const title=useRef<HTMLHeadingElement>(null);
  const step=steps[index];
  useEffect(()=>{title.current?.focus();},[index]);
  function go(next:number){setIndex(next);setAnswer(null);setChecked(false);}
  const back=preview?"/study/preview":"/study";
  return <div className="mini-study-surface">
    <a className="mini-study-skip" href="#assignment-main">Skip to your preparation</a>
    <header className="mini-study-header"><Link href={back}>Digital Learning Hub{preview?" · Preview only":""}</Link></header>
    <main id="assignment-main" className="mini-study-main">
      <p className="assignment-deadline"><strong>Assignment 1 · Due {assignmentOne.dueLabel}</strong><br/>
        {schedule.phase==="past"?"The planned date has passed. Check your submission or any agreed extension with your teacher.":schedule.phase==="due"?"Due today. Confirm the time and submission location with your teacher.":`${schedule.days} calendar days to the due date. Your teacher will confirm the submission time.`}
      </p>
      <p className="assignment-note">{unit==="4"?"Unit 4 Programming":"Unit 6 Website Development"} · Learning aim A. Use this preparation guide alongside your teacher&apos;s assignment brief.</p>
      <details className="mini-study-help assignment-plan"><summary>See the plan or choose a step</summary>
        <label htmlFor="assignment-step">Open a preparation step</label>
        <select id="assignment-step" value={index} onChange={event=>go(Number(event.target.value))}>
          {steps.map((item,i)=><option key={item.id} value={i}>{i+1}. {item.title} ({item.dates})</option>)}
        </select>
        <p>These dates suggest when to work on each part. Every step is available now. Revisit anything you need; the calendar does not know what you have completed.</p>
        <button type="button" className="assignment-text-button" onClick={()=>go(schedule.current)}>Go to the current checkpoint</button>
      </details>
      <section className="mini-study-panel" aria-labelledby="assignment-title">
        <p className="mini-study-kicker">Step {index+1} of {steps.length} · Suggested {step.dates}</p>
        <h1 id="assignment-title" ref={title} tabIndex={-1}>{step.title}</h1>
        <p>{step.idea}</p>
        <h2 className="assignment-subheading">Try this in your own work</h2>
        <ol className="assignment-tasks">{step.task.map(task=><li key={task}>{task}</li>)}</ol>
        <aside className="mini-study-example"><h2>What to keep</h2><p>{step.evidence}</p></aside>
        {step.id==="harvard"&&<aside className="mini-study-example">
          <h2>One real source, two parts</h2>
          <p>In your writing: <strong>(Pearson, 2020)</strong></p>
          <p>In your reference list:</p>
          <p>Pearson (2020) <em>Pearson BTEC Level 3 National Diploma in Information Technology: Specification.</em> Issue 6. Available at: [the web address of the source you actually used] (Accessed: [the date you opened the document]).</p>
          <p>Replace the access-date instruction with your own date and add the address of the source you actually used to your written reference. The document&apos;s year is 2020, even when you read it in 2026.</p>
        </aside>}
        <details className="mini-study-help"><summary>A little help</summary><p>{step.help}</p></details>
        {step.links&&<div className="assignment-tools"><h2 className="assignment-subheading">Useful links</h2><ul>{step.links.filter(link=>!new URL(link.url).hostname.endsWith("pearson.com")).map(link=><li key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.title} <span className="sr-only">(opens in a new tab)</span></a></li>)}</ul></div>}
        <details className="mini-study-help" key={step.id}><summary>Try a quick practice check</summary>
          <fieldset className="mini-study-options"><legend>{step.check.question}</legend>
            {step.check.options.map((option,i)=><label className="mini-study-option" key={option}><input type="radio" name={`check-${step.id}`} checked={answer===i} onChange={()=>{setAnswer(i);setChecked(false);}}/>{option}</label>)}
          </fieldset>
          <button type="button" className="mini-study-primary" disabled={answer===null} onClick={()=>setChecked(true)}>Check my understanding</button>
          {checked&&<p role="status"><strong>{answer===step.check.correct?"That's right. ":"Let's look again. "}</strong>{step.check.feedback}</p>}
          <p className="assignment-note">Practice only. This check is not saved or graded.</p>
        </details>
        <nav className="assignment-navigation" aria-label="Preparation steps">
          {index>0&&<button className="assignment-text-button" type="button" onClick={()=>go(index-1)}>Previous step</button>}
          {index<steps.length-1?<button className="mini-study-primary" type="button" onClick={()=>go(index+1)}>Next step</button>:<Link href={back} className="mini-study-primary">Back to learning</Link>}
        </nav>
      </section>
      <p className="assignment-note">You can stop here and close the portal, or choose another step when you feel ready.</p>
      <p className="assignment-note">Keep your evidence and writing in your own document. Reading this guide does not save assignment progress or submit work. Follow any individual deadline agreed with your teacher.</p>
      <details className="mini-study-help"><summary>About the requirements</summary><p>{unit==="4"?programmingRequirements:"This guide supports comparison (A.P1), analysis (A.M1) and evaluation (A.D1). It does not replace your brief or cover the whole of learning aims B and C. Your assessor judges your independent work."}</p><p>Harvard is taught here as a consistent author–date format. The specification does not prescribe a Harvard variant or require the particular testing tools linked above.</p></details>
    </main>
    <footer className="mini-study-footer"><Link href={back}>Back to your learning</Link><a href={unit==="4"?"/programming-assignment-one-evidence-template.txt":"/assignment-one-evidence-template.txt"} download>Download a blank evidence sheet</a></footer>
  </div>;
}

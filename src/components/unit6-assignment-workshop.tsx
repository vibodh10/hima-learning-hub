"use client";

import Link from "next/link";
import {useEffect, useRef, useState} from "react";
import {submissionChecks, workshopSteps} from "@/lib/unit6-assignment-workshop";

export function Unit6AssignmentWorkshop({preview=false}: {preview?: boolean}) {
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const step = workshopSteps[index];
  const back = preview ? "/study/preview" : "/study";
  useEffect(() => {heading.current?.focus();}, [index]);

  return <div className="mini-study-surface">
    <a className="mini-study-skip" href="#assignment-main">Skip to the assignment step</a>
    <header className="mini-study-header"><Link href={back}>Digital Learning Hub{preview ? " · Preview only" : ""}</Link></header>
    <main id="assignment-main" className="mini-study-main">
      <p className="mini-study-kicker">Unit 6 · Assignment 1 · Learning aim A</p>
      <p className="assignment-note">Retro Rewind Games · Compare, analyse and evaluate two websites.</p>
      <details className="mini-study-help assignment-plan">
        <summary>Choose a step or return to a section</summary>
        <label htmlFor="workshop-step">Open an assignment step</label>
        <select id="workshop-step" value={index} onChange={event => setIndex(Number(event.target.value))}>
          {workshopSteps.map((item, i) => <option key={item.id} value={i}>{i+1}. {item.title}</option>)}
        </select>
        <p>Every step is available. Continue from the section you need; you do not need to repeat work already in your document.</p>
        <button type="button" className="assignment-text-button" onClick={() => setIndex(0)}>Back to Start here</button>
      </details>
      <section className="mini-study-panel" aria-labelledby="workshop-title">
        <p className="mini-study-kicker">Step {index+1} of {workshopSteps.length} · {step.phase}</p>
        <h1 id="workshop-title" ref={heading} tabIndex={-1}>{step.title}</h1>
        <p className="assignment-note"><strong>Where to write:</strong> {step.section}</p>
        <p>{step.explain}</p>
        <h2 className="assignment-subheading">Do this now</h2>
        <ol className="assignment-tasks">{step.actions.map(action => <li key={action}>{action}</li>)}</ol>
        <aside className="mini-study-example"><h2>Evidence to keep</h2><p>{step.evidence}</p></aside>
        {(step.starter || step.help) && <details className="mini-study-help" key={`${step.id}-help`}>
          <summary>Show an example or extra help</summary>
          {step.starter && <><h2 className="assignment-subheading">Sentence starter</h2><p>{step.starter}</p><p>Complete this using your own findings. Do not copy example claims into your assignment.</p></>}
          {step.help && <p>{step.help}</p>}
        </details>}
        {step.links && <details className="mini-study-help" key={`${step.id}-links`}>
          <summary>{step.id === "websites" ? "Open the seven approved website choices" : "Open tools and source links"}</summary>
          <ul className="assignment-tasks">{step.links.map(link => <li key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.title}{" "}<span className="sr-only">(opens in a new tab)</span></a></li>)}</ul>
        </details>}
        {step.id === "review" && <details className="mini-study-help">
          <summary>Open the final submission checklist</summary>
          {submissionChecks.map((item, i) => <label className="mini-study-option" key={item}>
            <input type="checkbox" checked={Boolean(checked[`final-${i}`])} onChange={event => setChecked({...checked, [`final-${i}`]: event.target.checked})}/>{item}
          </label>)}
        </details>}
        <h2 className="assignment-subheading">Before moving on</h2>
        <label className="mini-study-option"><input type="checkbox" checked={Boolean(checked[step.id])} onChange={event => setChecked({...checked, [step.id]: event.target.checked})}/>{step.check}</label>
        <p className="assignment-note">Tick only after checking your document. Ticks last for this visit only; they are not marks or submission records.</p>
        <nav className="assignment-navigation" aria-label="Assignment guide steps">
          {index > 0 && <button type="button" className="assignment-text-button" onClick={() => setIndex(index-1)}>Previous step</button>}
          {index < workshopSteps.length-1 ? <button type="button" className="mini-study-primary" onClick={() => setIndex(index+1)}>Next step</button> : <Link href={back} className="mini-study-primary">Back to learning</Link>}
        </nav>
      </section>
      <details className="mini-study-help">
        <summary>Your materials, deadline and where to get help</summary>
        <p>Use your assignment brief, ‘assignment1_Template with links’, Assignment Guide, checklist, Support notes example and Tools to use document alongside this guide.</p>
        <p>The supplied brief leaves the deadline blank. Follow the date, time and any individual extension confirmed by Hima. This guide does not set or change your deadline.</p>
        <p>Keep all writing and evidence in your own document. This guide does not upload, assess or submit your assignment. Your assessor decides whether the criteria are met.</p>
        <p>If you need help, identify the step, show what you have tried and explain the exact point you cannot complete.</p>
      </details>
    </main>
    <footer className="mini-study-footer"><Link href={back}>Back to your learning</Link><span>Developed by Hima</span></footer>
  </div>;
}

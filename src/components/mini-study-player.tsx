"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { beginMiniStudy, checkMiniStudy, finishMiniStudy } from "@/app/actions/mini-study";
import type { StudyCard, StudyGrade, StudyResponse, StudyResult, StudyReward } from "@/lib/mini-study";
import type { StudyHome } from "@/lib/mini-study-server";

export function MiniStudyHome({initial}:{initial:StudyHome}) {
  const [home,setHome]=useState(initial);
  const [pending,start]=useTransition();
  if(home.status==="active") return <MiniStudyPlayer key={home.card.sessionId} card={home.card} initialGrade={home.grade}/>;
  if(home.status==="done") return <StudyDone reward={home.reward}/>;
  return <section className="mini-study-panel">
    <p className="mini-study-kicker">Your self-study</p>
    <h1>{home.status==="ready"?(home.kind==="baseline"?"Let's find your starting point":"One small step today"):home.status==="complete"?"You're up to date":"Your next step"}</h1>
    {home.status==="ready"?<><p>{home.unitTitle}</p><p>{home.kind==="baseline"?"Four basic questions. It is fine not to know the answers yet.":"A quick recap, one idea and a short check. Then you're done."}</p></>:<p role={home.status==="unavailable"?"status":undefined}>{home.message}</p>}
    {home.status!=="complete"&&<button className="mini-study-primary" disabled={pending} onClick={()=>start(async()=>{
      try{setHome(await beginMiniStudy());}
      catch{setHome({status:"unavailable",message:"Your connection was interrupted. Try again to reopen your saved step."});}
    })}>{pending?"Opening your step…":home.status==="ready"?"Start":"Try again"}</button>}
  </section>;
}

type PlayerProps={
  card:StudyCard;initialGrade?:StudyGrade|null;
  check?:(sessionId:string,responses:StudyResponse[])=>Promise<StudyResult>;
  finish?:(sessionId:string)=>Promise<{ok:true;reward:StudyReward}|{ok:false;message:string}>;
};

export function MiniStudyPlayer({card,initialGrade,check=checkMiniStudy,finish=finishMiniStudy}:PlayerProps) {
  const [phase,setPhase]=useState<"learn"|"questions"|"feedback">(initialGrade?"feedback":card.questions[0]?.recap?"questions":"learn");
  const [questionIndex,setQuestionIndex]=useState(0);
  const [responses,setResponses]=useState<Record<string,StudyResponse["answer"]>>({});
  const [grade,setGrade]=useState<StudyGrade|null>(initialGrade??null);
  const [feedbackIndex,setFeedbackIndex]=useState(0);
  const [reward,setReward]=useState<StudyReward|null>(null);
  const [savingCompletion,setSavingCompletion]=useState(false);
  const [error,setError]=useState("");
  const [pending,start]=useTransition();
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus();},[phase,questionIndex,feedbackIndex,reward]);
  const question=card.questions[questionIndex];
  // Feedback follows the questions the learner actually saw, not source-file order.
  const feedback=grade?card.questions.flatMap(q=>grade.feedback.filter(f=>f.questionId===q.id)):[];
  const currentFeedback=feedback[feedbackIndex];
  const answer=responses[question?.id];
  const validAnswer=question?.kind==="choice"?typeof answer==="string":
    Boolean(answer && typeof answer!=="string" && question.stems?.every(s=>answer[s.id]) && new Set(Object.values(answer)).size===question.stems?.length);
  const setAnswer=(value:StudyResponse["answer"])=>{setResponses(current=>({...current,[question.id]:value}));setError("");};

  function nextQuestion() {
    if(!validAnswer){setError("Choose an answer before continuing.");return;}
    if(question.recap) {setQuestionIndex(questionIndex+1);setPhase("learn");return;}
    if(questionIndex<card.questions.length-1){setQuestionIndex(questionIndex+1);return;}
    start(async()=>{
      try {
        const result=await check(card.sessionId,card.questions.map(q=>({questionId:q.id,answer:responses[q.id]})));
        if(!result.ok){setError(result.message);return;}
        setGrade(result.grade);setFeedbackIndex(0);setPhase("feedback");setError("");
      }catch{setError("We couldn't save your answers. They are still here—please try again.");}
    });
  }
  function finishStep() {
    setSavingCompletion(true);
    start(async()=>{
      try {
        const result=await finish(card.sessionId);
        if(result.ok){setReward(result.reward);setError("");}
        else setError(result.message);
      }catch{setError("We couldn't save your completion. Please try again; you won't receive duplicate rewards.");}
    });
  }
  if(reward) return <StudyDone reward={reward}/>;

  return <section className="mini-study-panel" aria-busy={pending}>
    <p className="mini-study-kicker">{card.unitTitle}</p>
    {phase==="learn"&&<>
      <h1 ref={heading} tabIndex={-1}>{card.title}</h1>
      <div className="mini-study-explanation">{card.lines.map(line=><p key={line}>{line}</p>)}</div>
      {card.example&&<aside className="mini-study-example"><h2>For example</h2><p>{card.example}</p></aside>}
      {card.support&&<details className="mini-study-help"><summary>A little help</summary><p>{card.support}</p></details>}
      {card.thinking&&<details className="mini-study-help"><summary>Take the idea further</summary><p>{card.thinking}</p></details>}
      <button className="mini-study-primary" onClick={()=>setPhase("questions")}>{card.kind==="baseline"?"First question":"Try a short check"}</button>
    </>}
    {phase==="questions"&&question&&<>
      <p className="mini-study-position">{question.recap?"From your last step":card.kind==="baseline"?`Question ${questionIndex+1} of ${card.questions.length}`:"Your short check"}</p>
      <h1 ref={heading} tabIndex={-1}>{question.prompt}</h1>
      {question.kind==="choice"?<fieldset className="mini-study-options"><legend className="sr-only">Choose one answer</legend>
        {question.options.map(option=><label key={option.id} className="mini-study-option">
          <input type="radio" name={question.id} value={option.id} checked={answer===option.id} disabled={pending} onChange={()=>setAnswer(option.id)}/><span>{option.text}</span>
        </label>)}
      </fieldset>:<fieldset className="mini-study-matches"><legend>Use each answer once.</legend>
        {question.stems?.map(stem=><label key={stem.id}><span>{stem.text}</span><select
          aria-label={stem.text} value={typeof answer==="object"?answer[stem.id]??"":""} disabled={pending}
          onChange={event=>setAnswer({...typeof answer==="object"?answer:{},[stem.id]:event.target.value})}>
          <option value="">Choose its meaning</option>{question.options.map(option=><option key={option.id} value={option.id}>{option.text}</option>)}
        </select></label>)}
        {answer && typeof answer==="object" && Object.values(answer).filter(Boolean).length!==new Set(Object.values(answer).filter(Boolean)).size&&<p role="status">Each meaning belongs to one idea. Choose a different meaning for the repeated answer.</p>}
      </fieldset>}
      <button className="mini-study-primary" disabled={pending||!validAnswer} onClick={nextQuestion}>{pending?"Saving your answers…":questionIndex===card.questions.length-1?"Check my answers":"Continue"}</button>
    </>}
    {phase==="feedback"&&currentFeedback&&<>
      <p className="mini-study-position">{currentFeedback.recap?"Your recap":"Your answer"}</p>
      <h1 ref={heading} tabIndex={-1}>{currentFeedback.correct?"That's right":"Let's look at this together"}</h1>
      <p>{currentFeedback.prompt??card.questions[feedbackIndex].prompt}</p>
      <p className="mini-study-feedback-answer">{currentFeedback.correctAnswer}</p>
      <p>{currentFeedback.explanation}</p>
      <button className="mini-study-primary" disabled={pending} onClick={()=>feedbackIndex<feedback.length-1?setFeedbackIndex(feedbackIndex+1):finishStep()}>
        {pending?(savingCompletion?"Saving your completion…":"Loading feedback…"):feedbackIndex<feedback.length-1?"Continue":"Finish for today"}
      </button>
    </>}
    {error&&<p className="mini-study-error" role="alert">{error}</p>}
  </section>;
}

export function StudyDone({reward}:{reward:StudyReward}) {
  const title=useRef<HTMLHeadingElement>(null);
  useEffect(()=>title.current?.focus(),[]);
  return <section className="mini-study-panel mini-study-done">
    <p className="mini-study-kicker">Small steps count</p>
    <h1 ref={title} tabIndex={-1}>You&apos;re done for today</h1>
    {reward.xp>0&&<p className="mini-study-xp">+{reward.xp} XP</p>}
    {reward.badge&&<p className="mini-study-badge"><span aria-hidden="true">★ </span>{reward.badge}</p>}
    <p>Well done for taking this step. Your next one is available on {new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"long"}).format(new Date(`${reward.nextOn}T12:00:00Z`))}.</p>
    <p>You can close the portal now.</p>
  </section>;
}

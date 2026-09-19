"use client";
import {TimedStartingPoint} from "./timed-starting-point";

import { useEffect, useRef, useState, useTransition } from "react";
import { beginMiniStudy, checkMiniStudy, finishMiniStudy, recordAssessmentIntegrityEvent } from "@/app/actions/mini-study";
import type { StudyCard, StudyGrade, StudyResponse, StudyResult, StudyReward } from "@/lib/mini-study";
import type { StudyHome } from "@/lib/mini-study-server";

export function MiniStudyHome({initial}:{initial:StudyHome}) {
  const [home,setHome]=useState(initial);
  const [pending,start]=useTransition();
  if(home.status==="active") return <MiniStudyPlayer key={home.card.sessionId} card={home.card} initialGrade={home.grade}/>;
  if(home.status==="done") return <StudyDone reward={home.reward}/>;
  return <section className="mini-study-panel">
    <p className="mini-study-kicker">Your self-study</p>
    <h1>{home.status==="ready"?(home.kind==="baseline"?"Let's find your starting point":"Your required next step"):home.status==="complete"?"You're up to date":"Your next step"}</h1>
    {home.status==="ready"?<><p>{home.unitTitle}</p><p>{home.kind==="baseline"?"A short timed starting point, one question at a time. The check moves on automatically.":"If a formal assessment is due, the SCCB Digital Learning Hub will open it before ordinary practice. Otherwise it will choose the next reinforcement or stretch step from your saved learning."}</p></>:<p role={home.status==="unavailable"?"status":undefined}>{home.message}</p>}
    {home.status!=="complete"&&<button className="mini-study-primary" disabled={pending} onClick={()=>start(async()=>{
      try{setHome(await beginMiniStudy());}
      catch{setHome({status:"unavailable",message:"Your connection was interrupted. Try again to reopen your saved step."});}
    })}>{pending?"Opening your step…":home.status==="ready"?"Start":"Try again"}</button>}
  </section>;
}

export type PlayerProps={
  card:StudyCard;initialGrade?:StudyGrade|null;
  check?:(sessionId:string,responses:StudyResponse[])=>Promise<StudyResult>;
  finish?:(sessionId:string)=>Promise<{ok:true;reward:StudyReward}|{ok:false;message:string}>;
};

export function MiniStudyPlayer(props:PlayerProps) {
 if(props.card.secondsPerQuestion&&!props.initialGrade)return <TimedStartingPoint {...props}/>;
 return <UntimedStudyPlayer {...props}/>;
}
export function UntimedStudyPlayer({card,initialGrade,check=checkMiniStudy,finish=finishMiniStudy}:PlayerProps) {
  const isAssessment=Boolean(card.assessmentKind);
  const [phase,setPhase]=useState<"learn"|"questions"|"feedback">(initialGrade?"feedback":card.questions[0]?.recap?"questions":"learn");
  const [assessmentStarted,setAssessmentStarted]=useState(!isAssessment||Boolean(initialGrade));
  const [integrityLocked,setIntegrityLocked]=useState(false);
  const [questionIndex,setQuestionIndex]=useState(0);
  const [responses,setResponses]=useState<Record<string,StudyResponse["answer"]>>({});
  const [grade,setGrade]=useState<StudyGrade|null>(initialGrade??null);
  const [feedbackIndex,setFeedbackIndex]=useState(0);
  const [reward,setReward]=useState<StudyReward|null>(null);
  const [savingCompletion,setSavingCompletion]=useState(false);
  const [error,setError]=useState("");
  const [pending,start]=useTransition();
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{heading.current?.focus();},[phase,questionIndex,feedbackIndex,reward,integrityLocked]);
  const integrityActive=isAssessment&&assessmentStarted&&!grade;

  useEffect(()=>{
    if(!integrityActive)return;
    const record=(event:"fullscreen_exit"|"tab_hidden")=>{void recordAssessmentIntegrityEvent(card.sessionId,event);};
    const fullscreen=()=>{
      if(!document.fullscreenElement){setIntegrityLocked(true);record("fullscreen_exit");}
      else setIntegrityLocked(false);
    };
    const visibility=()=>{
      if(document.visibilityState==="hidden"){setIntegrityLocked(true);record("tab_hidden");}
      else if(document.fullscreenElement)setIntegrityLocked(false);
    };
    const block=(event:Event)=>event.preventDefault();
    const blockShortcuts=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&["c","v","x","a","p","s"].includes(event.key.toLowerCase()))event.preventDefault();
    };
    document.addEventListener("fullscreenchange",fullscreen);
    document.addEventListener("visibilitychange",visibility);
    document.addEventListener("copy",block);document.addEventListener("cut",block);document.addEventListener("paste",block);
    document.addEventListener("contextmenu",block);document.addEventListener("selectstart",block);document.addEventListener("dragstart",block);
    document.addEventListener("keydown",blockShortcuts);
    return ()=>{
      document.removeEventListener("fullscreenchange",fullscreen);
      document.removeEventListener("visibilitychange",visibility);
      document.removeEventListener("copy",block);document.removeEventListener("cut",block);document.removeEventListener("paste",block);
      document.removeEventListener("contextmenu",block);document.removeEventListener("selectstart",block);document.removeEventListener("dragstart",block);
      document.removeEventListener("keydown",blockShortcuts);
    };
  },[integrityActive,card.sessionId]);

  const question=card.questions[questionIndex];
  // Feedback follows the questions the learner actually saw, not source-file order.
  const feedback=grade?card.questions.flatMap(q=>grade.feedback.filter(f=>f.questionId===q.id)):[];
  const currentFeedback=feedback[feedbackIndex];
  const answer=responses[question?.id];
  const validAnswer=question?.kind==="choice"?typeof answer==="string":
    Boolean(answer && typeof answer!=="string" && question.stems?.every(s=>answer[s.id]) && new Set(Object.values(answer)).size===question.stems?.length);
  const setAnswer=(value:StudyResponse["answer"])=>{setResponses(current=>({...current,[question.id]:value}));setError("");};

  async function enterAssessment(){
    setError("");
    if(!document.documentElement.requestFullscreen){setError("Full screen is required for this assessment, but this browser does not support it. Please use a supported desktop browser or ask your tutor.");return;}
    try{
      await document.documentElement.requestFullscreen();
      setAssessmentStarted(true);setIntegrityLocked(false);setPhase("questions");
    }catch{setError("Full screen is required before the assessment can start. Allow full screen and try again.");}
  }

  async function returnToFullscreen(){
    setError("");
    try{
      if(!document.fullscreenElement)await document.documentElement.requestFullscreen();
      setIntegrityLocked(false);
      void recordAssessmentIntegrityEvent(card.sessionId,"fullscreen_return");
    }catch{setError("Return to full screen to continue your assessment.");}
  }

  function nextQuestion() {
    if(integrityActive&&!document.fullscreenElement){setIntegrityLocked(true);return;}
    if(!validAnswer){setError("Choose an answer before continuing.");return;}
    if(question.recap) {setQuestionIndex(questionIndex+1);setPhase("learn");return;}
    if(questionIndex<card.questions.length-1){setQuestionIndex(questionIndex+1);return;}
    start(async()=>{
      try {
        const result=await check(card.sessionId,card.questions.map(q=>({questionId:q.id,answer:responses[q.id]})));
        if(!result.ok){setError(result.message);return;}
        setGrade(result.grade);setIntegrityLocked(false);setFeedbackIndex(0);setPhase("feedback");setError("");
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
  const attentionNotice=grade&&grade.total>0&&grade.correct/grade.total<.5
    ? card.assessmentKind
      ? "Learning check warning: this assessment needs reinforcement. The SCCB Digital Learning Hub has recorded it and will automatically give you relevant practice and recheck the skills."
      : "Learning check warning: this first-attempt check needs attention. The SCCB Digital Learning Hub will automatically give you extra explanation, practice and another check."
    : undefined;
  if(reward) return <StudyDone reward={reward} attentionNotice={attentionNotice}/>;

  if(isAssessment&&!assessmentStarted&&!initialGrade)return <section className="mini-study-panel">
    <p className="mini-study-kicker">{card.unitTitle}</p>
    <h1>{card.title}</h1>
    <div className="mini-study-explanation">{card.lines.map(line=><p key={line}>{line}</p>)}</div>
    <div className="mini-study-help">
      <h2>Assessment integrity</h2>
      <p>This assessment must stay in full screen. If you leave full screen or switch away from this page, the assessment pauses and the event is recorded for your tutor. You can return to full screen and continue.</p>
      <p>Question and answer order may differ from another learner&apos;s. Copy, paste, text selection and the context menu are disabled while the assessment is active.</p>
    </div>
    <button className="mini-study-primary" onClick={enterAssessment}>Enter full screen and start assessment</button>
    {error&&<p className="mini-study-error" role="alert">{error}</p>}
  </section>;

  if(integrityLocked&&integrityActive)return <section className="mini-study-panel" role="alert" style={{userSelect:"none"}}>
    <p className="mini-study-kicker">Assessment paused</p>
    <h1>Return to full screen to continue your assessment</h1>
    <p>Your answers are still here. The assessment page or full-screen exit has been recorded for your tutor. This does not automatically fail the assessment.</p>
    <button className="mini-study-primary" onClick={returnToFullscreen}>Return to full screen</button>
    {error&&<p className="mini-study-error" role="alert">{error}</p>}
  </section>;

  return <section className="mini-study-panel" aria-busy={pending} style={integrityActive?{userSelect:"none"}:undefined}>
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
      <p className="mini-study-position">{question.recap?"From your last step":card.kind==="baseline"?`Question ${questionIndex+1} of ${card.questions.length}`:card.assessmentKind?`Assessment question ${questionIndex+1} of ${card.questions.length}`:"Your short check"}</p>
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

export function StudyDone({reward,attentionNotice}:{reward:StudyReward;attentionNotice?:string}) {
  const title=useRef<HTMLHeadingElement>(null);
  const [next,setNext]=useState<StudyHome|null>(null);
  const [error,setError]=useState("");
  const [pending,start]=useTransition();
  useEffect(()=>title.current?.focus(),[]);
  if(next) return <MiniStudyHome initial={next}/>;
  return <section className="mini-study-panel mini-study-done">
    <p className="mini-study-kicker">Small steps count</p>
    <h1 ref={title} tabIndex={-1}>You&apos;re done for today</h1>
    {reward.xp>0&&<p className="mini-study-xp">+{reward.xp} XP</p>}
    {reward.badge&&<p data-achievement-badge className="mini-study-badge"><span className="gold-badge-icon" aria-hidden="true">★</span>{reward.badge}</p>}
    {attentionNotice&&<p className="mini-study-error" role="status">{attentionNotice}</p>}
    <p>Well done for taking this step. Your result has been saved, and the SCCB Digital Learning Hub will choose what you need next automatically. If you want to keep learning, you can do another lesson.</p>
    <p>You can close the portal now.</p>
    <button className="mini-study-primary" disabled={pending} onClick={()=>start(async()=>{
      setError("");
      try {
        const result=await beginMiniStudy(true);
        if(result.status==="unavailable") setError(result.message);
        else if(result.status==="done") setError("Your next lesson could not be opened yet. Please try again.");
        else setNext(result);
      } catch {setError("Your connection was interrupted. Your completed step is saved. Try again when you're ready.");}
    })}>{pending?"Opening your next step…":"Continue learning"}</button>
    {error&&<p className="mini-study-error" role="alert">{error}</p>}
  </section>;
}

"use client";
import {studyShuffle} from "@/lib/mini-study";
import {useState} from "react";
import {serviceDeliveryStudy} from "@/lib/mini-study-service-delivery";
export function Unit14Teaching(){
 const [index,setIndex]=useState(0);const [answer,setAnswer]=useState("");const [checked,setChecked]=useState(false);
 const lesson=serviceDeliveryStudy.lessons[index];const question=lesson.questions[0];
 function go(value:number){setIndex(value);setAnswer("");setChecked(false);}
 return <section className="mini-study-panel"><p className="mini-study-kicker">Learn first · {index+1} of {serviceDeliveryStudy.lessons.length}</p><h2 className="text-2xl font-bold">{lesson.title}</h2>{lesson.lines.map(line=><p key={line}>{line}</p>)}
 <aside className="mini-study-example"><h3 className="font-bold">Worked example</h3><p>{lesson.example}</p></aside>
 <fieldset className="mini-study-options"><legend>{question.prompt}</legend>{studyShuffle(question.options,lesson.id).map(option=><label key={option.id} className="mini-study-option"><input type="radio" checked={answer===option.id} onChange={()=>{setAnswer(option.id);setChecked(false);}} name="teaching-check"/>{option.text}</label>)}</fieldset>
 <button className="mini-study-primary" type="button" disabled={!answer} onClick={()=>setChecked(true)}>Check my understanding</button>
 {checked&&<p role="status"><strong>{answer===question.answer?"That's right. ":"Let's look again. "}</strong>{question.explanation}</p>}
 <details className="mini-study-help"><summary>Help me explain my reasoning</summary><p>{lesson.support}</p><p>{lesson.analysis}</p><p>{lesson.evaluation}</p></details>
 <nav className="flex flex-wrap gap-4 mt-6" aria-label="Teaching steps">{index>0&&<button className="button-secondary" type="button" onClick={()=>go(index-1)}>Previous idea</button>}{index<serviceDeliveryStudy.lessons.length-1&&<button className="button" type="button" onClick={()=>go(index+1)}>Learn another idea</button>}</nav>
 <p className="text-sm">This quick rehearsal is not saved. Your normal daily learning step saves its answers and awards XP. You can stop here or move on to a written practice task below.</p></section>;
}


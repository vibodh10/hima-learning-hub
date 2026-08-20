"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Mark } from "@/components/icons";
import { COURSE_LABELS, type EligibilityDecision, type Pathway, type Qualification, type QualificationStatus, type ResultStatus, type Student } from "@/lib/course-entry-readiness";

type PublicQuestion = { id:string; pathway:string; category:string; difficulty:"easy"|"medium"|"hard"; question:string; options:string[] };
type Result = { score:number; percentage:number; band:string; unanswered:number; categoryScores:Record<string,{correct:number;total:number}>; review:Array<{id:string;question:string;category:string;selected?:number;yourAnswer:string;correctAnswer:string;explanation:string;isCorrect:boolean}> };
type AnswerMap = Record<string, number>;

const emptyStudent: Student = { firstName:"", lastName:"", dob:"", email:"", school:"", pathway:"digital-support-security", qualificationStatus:"achieved" };
function makeQual(category:Qualification["category"], subject:string):Qualification { return { id:`${category}-${Date.now()}-${Math.random().toString(36).slice(2)}`, category, subject, qualificationType:category==="international"?"":"GCSE", grade:"", predictedGrade:"", resultStatus:"achieved", country:"", awardingBody:"" }; }
function statusLabel(status:EligibilityDecision["status"]) { return ({eligible:"Eligible",provisionally_eligible:"Provisionally Eligible",not_eligible:"Not Eligible",qualification_verification_required:"Qualification Verification Required",entry_criteria_pending:"Entry Criteria Pending"} as const)[status]; }

async function api(path:string,body:unknown){const r=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||"Something went wrong.");return data;}

export default function CourseEntryReadinessPage(){
    const [step,setStep]=useState<"entry"|"eligibility"|"assessment"|"result">("entry");
    const [student,setStudent]=useState<Student>(emptyStudent);
    const [qualifications,setQualifications]=useState<Qualification[]>([makeQual("english","English"),makeQual("maths","Maths"),makeQual("other",""),makeQual("other","")]);
    const [eligibility,setEligibility]=useState<EligibilityDecision|null>(null);
    const [questions,setQuestions]=useState<PublicQuestion[]>([]);
    const [answers,setAnswers]=useState<AnswerMap>({});
    const [secondsLeft,setSecondsLeft]=useState(600);
    const [result,setResult]=useState<Result|null>(null);
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState("");

    const courseLabel=COURSE_LABELS[student.pathway];
    const canAssess=eligibility&&["eligible","provisionally_eligible","qualification_verification_required"].includes(eligibility.status);
    const criteria=useMemo(()=>student.pathway==="btec-national-diploma-it"?["4 GCSEs at Grade 3 or above","Grade 4+ in either English or Maths","OR Functional Skills Level 2 / Level 2 BTEC / related Level 2 Digital Diploma","Age 16+ · Digbeth or Longbridge"]:student.pathway==="btec-extended-diploma-it"?["4 GCSEs at Grade 4 or above","English Grade 4+","Maths Grade 4+","Age 16+ · Longbridge"]:["4 GCSEs at Grade 4 or above","English Grade 4+","Maths Grade 4+","Age 16–18 · Digbeth"],[student.pathway]);
    function updateQualification(id:string,patch:Partial<Qualification>){setQualifications(rows=>rows.map(q=>q.id===id?{...q,...patch}:q));}
    function addQualification(){setQualifications(rows=>[...rows,makeQual(student.qualificationStatus==="international"?"international":"other","")]);}
    async function checkEligibility(){setBusy(true);setError("");try{const decision=await api("/api/course-entry-readiness/eligibility",{student,qualifications});setEligibility(decision);setStep("eligibility");}catch(e){setError(e instanceof Error?e.message:"Unable to check eligibility.");}finally{setBusy(false);}}
    async function startAssessment(){setBusy(true);setError("");try{const data=await api("/api/course-entry-readiness/start",{student,qualifications});setEligibility(data.eligibility);setQuestions(data.questions);setAnswers({});setSecondsLeft(data.durationSeconds??600);setResult(null);setStep("assessment");}catch(e){setError(e instanceof Error?e.message:"Unable to start assessment.");}finally{setBusy(false);}}
    const submitAssessment = useCallback(async () => {
        if (!questions.length || busy) return;

        setBusy(true);
        setError("");

        try {
            const data = await api("/api/course-entry-readiness/submit", {
                student,
                qualifications,
                questionIds: questions.map((q) => q.id),
                answers,
            });

            setResult(data);
            setStep("result");
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Unable to mark assessment."
            );
        } finally {
            setBusy(false);
        }
    }, [questions, busy, student, qualifications, answers]);

    useEffect(() => {
        if (step !== "assessment") return;

        const delay = secondsLeft <= 0 ? 0 : 1000;

        const t = window.setTimeout(() => {
            if (secondsLeft <= 0) {
                void submitAssessment();
                return;
            }

            setSecondsLeft((v) => Math.max(0, v - 1));
        }, delay);

        return () => window.clearTimeout(t);
    }, [step, secondsLeft, submitAssessment]);
    function reset(){setStep("entry");setStudent(emptyStudent);setQualifications([makeQual("english","English"),makeQual("maths","Maths"),makeQual("other",""),makeQual("other","")]);setEligibility(null);setQuestions([]);setAnswers({});setResult(null);setSecondsLeft(600);setError("");}

    const mm=String(Math.floor(secondsLeft/60)).padStart(2,"0"), ss=String(secondsLeft%60).padStart(2,"0");

    return <main className="min-h-screen bg-slate-50">
        <nav className="shell flex items-center justify-between py-6" aria-label="Main navigation"><Link href="/" className="flex items-center gap-3 font-bold text-slate-950"><Mark>H</Mark><span>Hima <span className="text-teal-700">Learning Hub</span></span></Link><Link href="/login" className="button button-small">Sign in</Link></nav>
        <div className="shell pb-16">
            <section className="mb-8 rounded-3xl bg-slate-950 px-6 py-8 text-white sm:px-10"><p className="eyebrow text-teal-300">Course entry</p><div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Course Entry & Readiness Assessment</h1><p className="mt-3 max-w-3xl leading-7 text-slate-300">Check the entry criteria first, then complete a 10-minute readiness assessment designed to test applied thinking for the course you selected.</p></div><div className="flex flex-wrap gap-2 text-xs font-bold">{["1 · Entry criteria","2 · Assessment","3 · Result"].map((x,i)=><span key={x} className={`rounded-full px-3 py-2 ${((step==="entry"||step==="eligibility")&&i===0)||(step==="assessment"&&i===1)||(step==="result"&&i===2)?"bg-teal-500 text-white":"bg-slate-800 text-slate-300"}`}>{x}</span>)}</div></div></section>
            {error&&<div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}

            {step==="entry"&&<section className="card">
                <p className="eyebrow">Step 1</p><h2 className="mt-2 text-2xl font-bold">Check your entry criteria</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field label="First name"><input className="input" value={student.firstName} onChange={e=>setStudent({...student,firstName:e.target.value})}/></Field>
                    <Field label="Last name"><input className="input" value={student.lastName} onChange={e=>setStudent({...student,lastName:e.target.value})}/></Field>
                    <Field label="Date of birth"><input className="input" type="date" value={student.dob} onChange={e=>setStudent({...student,dob:e.target.value})}/></Field>
                    <Field label="Email"><input className="input" type="email" value={student.email} onChange={e=>setStudent({...student,email:e.target.value})}/></Field>
                    <Field label="Current / previous school or college" span><input className="input" value={student.school} onChange={e=>setStudent({...student,school:e.target.value})}/></Field>
                    <Field label="Course" span><select className="input" value={student.pathway} onChange={e=>setStudent({...student,pathway:e.target.value as Pathway})}>{Object.entries(COURSE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field>
                    <Field label="Qualification status" span><select className="input" value={student.qualificationStatus} onChange={e=>setStudent({...student,qualificationStatus:e.target.value as QualificationStatus})}><option value="achieved">Results achieved</option><option value="awaiting">Awaiting results</option><option value="international">International qualifications</option><option value="alternative_uk">Alternative UK qualifications</option></select></Field>
                </div>
                <aside className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-5"><h3 className="font-bold text-teal-950">Entry criteria for {courseLabel}</h3><ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-teal-950">{criteria.map(c=><li key={c}>{c}</li>)}</ul></aside>
                <div className="mt-8 flex items-center justify-between gap-4"><div><p className="eyebrow">Qualifications</p><h3 className="mt-1 text-xl font-bold">Enter your grades</h3></div><button className="button-secondary button-small" onClick={addQualification}>+ Add qualification</button></div>
                <div className="mt-4 grid gap-4">{qualifications.map((q,index)=><div key={q.id} className="rounded-2xl border border-slate-200 p-4"><div className="mb-3 flex justify-between"><strong>{q.category==="english"?"English":q.category==="maths"?"Maths":`Qualification ${index+1}`}</strong>{(q.category==="other"||q.category==="international")&&<button className="text-sm font-bold text-red-700" onClick={()=>setQualifications(rows=>rows.filter(r=>r.id!==q.id))}>Remove</button>}</div><div className="grid gap-3 md:grid-cols-4">
                    <Field label="Subject"><input className="input" value={q.subject} onChange={e=>updateQualification(q.id,{subject:e.target.value})}/></Field>
                    <Field label="Qualification type"><input className="input" placeholder="e.g. GCSE" value={q.qualificationType} onChange={e=>updateQualification(q.id,{qualificationType:e.target.value})}/></Field>
                    <Field label="Status"><select className="input" value={q.resultStatus} onChange={e=>updateQualification(q.id,{resultStatus:e.target.value as ResultStatus})}><option value="achieved">Achieved</option><option value="awaiting">Awaiting</option></select></Field>
                    <Field label={q.resultStatus==="awaiting"?"Predicted grade":"Grade"}><input className="input" value={q.resultStatus==="awaiting"?q.predictedGrade:q.grade} onChange={e=>updateQualification(q.id,q.resultStatus==="awaiting"?{predictedGrade:e.target.value}:{grade:e.target.value})}/></Field>
                    {student.qualificationStatus==="international"&&<><Field label="Country"><input className="input" value={q.country} onChange={e=>updateQualification(q.id,{country:e.target.value,category:"international"})}/></Field><Field label="Awarding body"><input className="input" value={q.awardingBody} onChange={e=>updateQualification(q.id,{awardingBody:e.target.value})}/></Field></>}
                </div></div>)}</div>
                <div className="mt-6 flex justify-end"><button className="button" disabled={busy||!student.firstName||!student.lastName||!student.dob||!student.email} onClick={checkEligibility}>{busy?"Checking…":"Check entry criteria"}</button></div><p className="mt-5 text-center text-xs text-slate-500">This is an internal entry and course-readiness assessment. It is not an awarding-body examination.</p>
            </section>}

            {step==="eligibility"&&eligibility&&<section className="card text-center"><span className={`inline-flex rounded-full px-3 py-2 text-xs font-black uppercase tracking-wider ${eligibility.status==="not_eligible"?"bg-red-100 text-red-800":eligibility.status.includes("verification")||eligibility.status.includes("pending")?"bg-amber-100 text-amber-900":"bg-teal-100 text-teal-900"}`}>{statusLabel(eligibility.status)}</span><h2 className="mt-4 text-3xl font-bold">Entry criteria check complete</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">{eligibility.reason}</p><div className="mx-auto mt-6 max-w-2xl rounded-2xl bg-slate-50 p-5 text-left"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Course</p><p className="mt-1 font-bold">{courseLabel}</p><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Rule used</p><p className="mt-1">{eligibility.ruleUsed}</p></div><div className="mt-7 flex flex-wrap justify-center gap-3"><button className="button-secondary" onClick={()=>setStep("entry")}>Edit details</button>{canAssess&&<button className="button" disabled={busy} onClick={startAssessment}>{busy?"Preparing…":"Start 10-minute assessment"}</button>}</div></section>}

            {step==="assessment"&&<section className="card"><div className="sticky top-0 z-10 -mx-6 -mt-6 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur"><div><p className="eyebrow">Step 2</p><h2 className="text-2xl font-bold">{courseLabel}</h2></div><div className={`rounded-xl px-4 py-2 text-center ${secondsLeft<=60?"bg-red-50 text-red-800":"bg-teal-50 text-teal-900"}`}><span className="block text-[10px] font-bold uppercase tracking-wider">Time left</span><strong className="text-2xl">{mm}:{ss}</strong></div></div><p className="my-5 text-slate-600">Choose the best answer for each scenario. Your answers are marked securely on the server after submission.</p><div className="grid gap-5">{questions.map((q,i)=><article key={q.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500"><span>Question {i+1}</span><span>{q.category}</span></div><h3 className="mt-3 text-lg font-bold leading-7">{q.question}</h3><div className="mt-4 grid gap-2">{q.options.map((opt,oi)=><label key={opt} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${answers[q.id]===oi?"border-teal-500 bg-teal-50":"border-slate-200 bg-white"}`}><input className="mt-1" type="radio" name={q.id} checked={answers[q.id]===oi} onChange={()=>setAnswers({...answers,[q.id]:oi})}/><span><strong className="mr-2">{String.fromCharCode(65+oi)}.</strong>{opt}</span></label>)}</div></article>)}</div><div className="mt-6 flex items-center justify-between gap-3"><span className="text-sm text-slate-500">Answered {Object.keys(answers).length} of 10</span><button className="button" disabled={busy} onClick={()=>void submitAssessment()}>{busy?"Marking…":"Submit assessment"}</button></div></section>}

            {step==="result"&&result&&eligibility&&<section className="card"><p className="eyebrow">Step 3</p><div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><span className={`inline-flex rounded-full px-3 py-2 text-xs font-black uppercase tracking-wider ${result.score>=6?"bg-teal-100 text-teal-900":"bg-slate-100 text-slate-700"}`}>{result.band}</span><h2 className="mt-4 text-3xl font-bold">Course Readiness Result</h2></div><div className="text-left md:text-right"><p className="text-sm text-slate-500">Assessment score</p><p className="text-4xl font-black text-teal-700">{result.score} / 10</p></div></div><div className="mt-6 grid gap-3 md:grid-cols-4"><ResultCard label="Student" value={`${student.firstName} ${student.lastName}`}/><ResultCard label="Entry criteria" value={statusLabel(eligibility.status)}/><ResultCard label="Percentage" value={`${result.percentage}%`}/><ResultCard label="Unanswered" value={String(result.unanswered)}/></div><h3 className="mt-8 text-xl font-bold">Category performance</h3><div className="mt-4 grid gap-3">{Object.entries(result.categoryScores).map(([cat,s])=><div key={cat}><div className="flex justify-between text-sm"><span>{cat}</span><strong>{s.correct}/{s.total}</strong></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-teal-600" style={{width:`${(s.correct/s.total)*100}%`}}/></div></div>)}</div><h3 className="mt-8 text-xl font-bold">Questions to review</h3><div className="mt-4 grid gap-3">{result.review.map((r,i)=><article key={r.id} className={`rounded-xl border-l-4 p-4 ${r.isCorrect?"border-teal-500 bg-teal-50":"border-red-400 bg-red-50"}`}><h4 className="font-bold">{i+1}. {r.question}</h4><p className="mt-2 text-sm"><strong>Your answer:</strong> {r.yourAnswer}</p>{!r.isCorrect&&<p className="mt-1 text-sm"><strong>Correct answer:</strong> {r.correctAnswer}</p>}<p className="mt-2 text-sm leading-6 text-slate-600"><strong>Why:</strong> {r.explanation}</p></article>)}</div><div className="mt-7 flex justify-end"><button className="button-secondary" onClick={reset}>Finish</button></div></section>}
        </div>
    </main>;
}

function Field({label,span,children}:{label:string;span?:boolean;children:React.ReactNode}){return <label className={`grid gap-2 text-sm font-bold text-slate-700 ${span?"md:col-span-2":""}`}><span>{label}</span>{children}</label>}
function ResultCard({label,value}:{label:string;value:string}){return <div className="rounded-2xl bg-slate-50 p-4"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span><strong className="mt-2 block">{value}</strong></div>}
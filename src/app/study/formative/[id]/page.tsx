import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {SowFormativeStudentForm} from "@/components/sow-formative-student-form";

export default async function SowFormativePage({params}:{params:Promise<{id:string}>}){
 const actor=await requireRole("student");const {id}=await params;const admin=createAdminClient();
 const {data:assessment}=await admin.from("sow_formative_assessments").select("id,title,purpose,questions,class_id,status").eq("id",id).maybeSingle();
 if(!assessment||assessment.status!=="published"||!assessment.class_id)notFound();
 const {data:enrolment}=await admin.from("enrolments").select("student_id").eq("class_id",assessment.class_id).eq("student_id",actor.id).is("archived_at",null).maybeSingle();
 if(!enrolment)notFound();
 const {data:submission}=await admin.from("sow_formative_submissions").select("responses,submitted_at").eq("assessment_id",id).eq("learner_id",actor.id).maybeSingle();
 const questions=Array.isArray(assessment.questions)?assessment.questions.filter((q):q is string=>typeof q==="string"):[];
 return <main className="shell max-w-3xl py-8">
  <Link className="link" href="/study">← Back to Study</Link>
  <p className="eyebrow mt-6">Formative assessment</p><h1 className="mt-2 text-3xl font-bold">{assessment.title}</h1>
  {assessment.purpose&&<p className="mt-3 text-slate-600">{assessment.purpose}</p>}
  <SowFormativeStudentForm assessmentId={assessment.id} questions={questions} initialResponses={Array.isArray(submission?.responses)?submission.responses.map(String):[]} submittedAt={submission?.submitted_at??null}/>
 </main>;
}
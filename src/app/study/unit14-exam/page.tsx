import {unit14TeacherPapers,unit14Catalogue} from "@/lib/unit14-teacher-resources";
import Link from "next/link";
import {requireRole} from "@/lib/auth";
import {requireCurriculumUnitAccess} from "@/lib/curriculum-access";
import {createClient} from "@/lib/supabase/server";
import {allStudyRows} from "@/lib/mini-study-evidence";
import {studyDay} from "@/lib/mini-study";
import {unit14Activities,unit14Checkpoint,unit14Papers,unit14Spec} from "@/lib/unit14-exam";
import {unit14Models} from "@/lib/unit14-models";
import {Unit14Teaching} from "@/components/unit14-teaching";
import {Unit14Task3Practice} from "@/components/unit14-task3-practice";
import {Unit14ExamPractice,ExamReflectionForm} from "@/components/unit14-exam-practice";

export default async function Unit14ExamPage({searchParams}:{searchParams:Promise<{classId?:string}>}){
 const actor=await requireRole("student","teacher","administrator");await requireCurriculumUnitAccess("14");
 const client=await createClient();const staff=actor.role!=="student";const requested=(await searchParams).classId;
 const {data:rows,error}=await client.from("class_units").select("class_id,units!inner(code),classes!inner(id,name,published,archived_at)").eq("units.code","14").eq("active",true).is("archived_at",null).eq("classes.published",true).is("classes.archived_at",null);
 if(error)throw new Error("Your Unit 14 groups could not be loaded.");
 const papers=staff?unit14TeacherPapers:unit14Papers;
 const groups=[] as {id:string;name:string}[];
 for(const row of rows??[]){const group=Array.isArray(row.classes)?row.classes[0]:row.classes;if(!group)continue;
  if(staff){const access=await client.rpc("can_manage_class",{class_uuid:group.id});if(access.error)throw new Error("Group access could not be checked.");if(!access.data)continue;}
  else {const membership=await client.from("enrolments").select("id").eq("student_id",actor.id).eq("class_id",group.id).is("archived_at",null).maybeSingle();if(membership.error)throw new Error("Your enrolment could not be checked.");if(!membership.data)continue;}
  groups.push({id:group.id,name:group.name});
 }
 const group=requested?groups.find(g=>g.id===requested):groups[0];
 const task3Only=Boolean(group&&/wednesday/i.test(group.name));
 const attempts=group?await allStudyRows((from,to)=>{
  let query=client.from("exam_practice_attempts").select("id,learner_id,paper_id,activity,response,reflection,submitted_at,reviewed_at,user_profiles!exam_practice_attempts_learner_id_fkey(display_name)",{count:"exact"}).eq("class_id",group.id).eq("unit_code","14");
  if(!staff)query=query.eq("learner_id",actor.id);
  return query.order("submitted_at",{ascending:false}).order("id").range(from,to);
 }):[];
 return <div className="mini-study-surface"><header className="mini-study-header"><Link href={staff?"/dashboard":"/study"}>Digital Learning Hub</Link></header><main className="mini-study-main">
 <h1 className="text-3xl font-bold">Unit 14 · Ready for January</h1><p className="mt-3">IT Service Delivery · January 2027. Learn a little, practise it, then improve your answer.</p><p className="assignment-deadline">{task3Only?"Wednesday group: Activity 3 is the only exam focus in this area for now.":unit14Checkpoint(studyDay(new Date()))}</p>
 <p className="assignment-note">Hima and Lee are teaching Unit 14 before the January assessment. Unit 19 follows afterwards. Your teachers will confirm the exact assessment dates and permitted preparation.</p>
 <details className="mini-study-help"><summary>The assessment and our plan</summary><p>Unit 14 is a Pearson external set task. Practise applying knowledge to an organisation, designing a connected service and justifying your decisions. Cover content areas A–D and assessment outcomes AO1–AO5 with your teachers.</p>{task3Only?<p>For the Wednesday group, this page is deliberately narrowed to Activity 3: IT service delivery solution. The intensive practice concentrates on network/service diagrams, DFDs, room and role mapping, data/information, hardware, software and clear scenario-specific explanations.</p>:<p>Start with individual activities. Work towards full mocks following each selected paper&apos;s instructions. Old paper dates and timings are not your January 2027 timetable.</p>}<p>Use this portal for practice, not during the live assessment.</p><p><a className="link" href={unit14Spec} target="_blank" rel="noreferrer">Pearson Extended Diploma specification</a></p><p><a className="link" href="https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Information-Technology/2016/External-assessments/asg-unit14-20161k-amended.pdf" target="_blank" rel="noreferrer">Pearson Unit 14 assessment guidance</a></p><p><Link className="link" href="/curriculum/units/14">Explore all Unit 14 topics and further practice</Link></p></details>
 {groups.length>1&&<nav aria-label="Choose group" className="my-4 flex flex-wrap gap-3">{groups.map(g=><Link key={g.id} className="link" href={`?classId=${g.id}`}>{g.name}</Link>)}</nav>}
 <div className="mt-6">{task3Only?<Unit14Task3Practice/>:<Unit14Teaching/>}</div>
 <details className="mini-study-help mt-6"><summary>{task3Only?"Choose a Pearson practice set for Activity 3":`Choose from ${unit14Papers.length} Pearson practice sets`}</summary><p>Resources from nine released past-task series and two sample sets. The June 2022 entry is Part B only. Some downloads are ZIP files: extract them on a computer and keep the matching instructions and templates together. Ask your teacher to help with missing files.</p><p>{task3Only?"Use the Activity 3 section from one unfamiliar scenario at a time. Draw the solution separately, then use the saved written practice below to explain the diagram and review omissions.":"Use one new scenario at a time, then review it before starting another. Keep one unfamiliar paper for a full mock."} These links open Pearson&apos;s documents; the portal does not claim to reproduce or mark them.</p>{papers.map(p=><article className="card mt-4" key={p.id}><h3 className="font-bold">{p.title}</h3>{p.note&&<p>{p.note}</p>}{!staff&&<p>Ask Hima or Lee for the question-only paper and templates. Download bundles and marking guidance are held in the teacher view.</p>}<ul className="mt-2 space-y-2">{p.links.map(l=><li key={l.url}><a className="link" href={l.url} target="_blank" rel="noreferrer">{l.title}</a></li>)}</ul></article>)}{staff&&<p><a className="link" href={unit14Catalogue} target="_blank" rel="noreferrer">Pearson&apos;s full Unit 14 catalogue (teacher resources)</a></p>}<p>Newer locked sets require teacher access. Hima or Lee can choose released materials for further practice.</p></details>
 <div id="practice">{group?<><p className="mt-6 font-bold">{group.name}</p><Unit14ExamPractice key={group.id} classId={group.id} staff={staff} activityOnly={task3Only?2:undefined}/></>:<p className="card mt-6">No accessible Unit 14 group was found. Ask your teacher to check your enrolment.</p>}</div>
 <details className="mini-study-help mt-6"><summary>{staff?"Group attempts and self-reviews":"My saved attempts and self-reviews"} · {attempts.length}</summary><p>Submitted answers are preserved. Self-review means the learner compared and reflected; it is not a teacher-approved mark or an exam grade.</p>{attempts.map(a=>{const learner=Array.isArray(a.user_profiles)?a.user_profiles[0]:a.user_profiles;return <details key={a.id} className="card mt-4"><summary className="cursor-pointer font-bold">{staff?`${learner?.display_name??"Learner"} · `:""}{unit14Papers.find(p=>p.id===a.paper_id)?.title??"Original guided scenario"} · {unit14Activities[a.activity]} · {a.reviewed_at?"Self-review completed":"Answer submitted · review next"}</summary><p>{new Date(a.submitted_at).toLocaleDateString("en-GB",{timeZone:"Europe/London"})}</p><p className="whitespace-pre-wrap">{a.response}</p><details className="my-4"><summary>Review guidance</summary>{a.paper_id==="guided"?<><p>One strong approach, not an official answer:</p><p>{unit14Models[a.activity].model}</p></>:staff?<p><a className="link" href={unit14Catalogue} target="_blank" rel="noreferrer">Find the matching Pearson marking grid and examiner report</a></p>:<p>Ask your teacher for feedback on this response.</p>}</details>{staff?<p className="whitespace-pre-wrap">{a.reflection??"No self-review yet."}</p>:<ExamReflectionForm id={a.id} initial={a.reflection??""}/>}</details>})}{!attempts.length&&<p>No written attempts submitted yet.</p>}</details>
 <p className="assignment-note">You can close the portal here and return when ready. Save your own diagrams and original files separately.</p>
 </main></div>;
}

import Link from "next/link";
import {requireRole} from "@/lib/auth";
import {requireCurriculumUnitAccess} from "@/lib/curriculum-access";
import {createClient} from "@/lib/supabase/server";
import {allStudyRows} from "@/lib/mini-study-evidence";
import {Unit2ExamPractice} from "@/components/unit2-exam-practice";
import {ExamReflectionForm} from "@/components/unit14-exam-practice";
import {unit2PracticeActivities,unit2PracticeScenarios,unit2PracticeSessions} from "@/lib/unit2-exam";

export default async function Unit2ExamPage({searchParams}:{searchParams:Promise<{classId?:string}>}){
  const actor=await requireRole("student","teacher","administrator");
  await requireCurriculumUnitAccess("2");
  const client=await createClient();
  const staff=actor.role!=="student";
  const requested=(await searchParams).classId;

  const {data:rows,error}=await client.from("class_units")
    .select("class_id,units!inner(code),classes!inner(id,name,published,archived_at)")
    .eq("units.code","2").eq("active",true).is("archived_at",null)
    .eq("classes.published",true).is("classes.archived_at",null);
  if(error)throw new Error("Your Unit 2 groups could not be loaded.");

  const groups=[] as {id:string;name:string}[];
  for(const row of rows??[]){
    const group=Array.isArray(row.classes)?row.classes[0]:row.classes;
    if(!group)continue;
    if(staff){
      const access=await client.rpc("can_manage_class",{class_uuid:group.id});
      if(access.error)throw new Error("Group access could not be checked.");
      if(!access.data)continue;
    }else{
      const membership=await client.from("enrolments").select("id").eq("student_id",actor.id).eq("class_id",group.id).is("archived_at",null).maybeSingle();
      if(membership.error)throw new Error("Your enrolment could not be checked.");
      if(!membership.data)continue;
    }
    groups.push({id:group.id,name:group.name});
  }

  const group=requested?groups.find(item=>item.id===requested):groups[0];
  const attempts=group?await allStudyRows((from,to)=>{
    let query=client.from("exam_practice_attempts")
      .select("id,learner_id,paper_id,activity,response,reflection,submitted_at,reviewed_at,user_profiles!exam_practice_attempts_learner_id_fkey(display_name)",{count:"exact"})
      .eq("class_id",group.id).in("paper_id",unit2PracticeScenarios.map(item=>item.id));
    if(!staff)query=query.eq("learner_id",actor.id);
    return query.order("submitted_at",{ascending:false}).order("id").range(from,to);
  }):[];

  return <div className="mini-study-surface">
    <header className="mini-study-header"><Link href={staff?"/dashboard":"/study"}>Digital Learning Hub</Link></header>
    <main className="mini-study-main">
      <h1 className="text-3xl font-bold">Unit 2 · Creating Systems to Manage Information</h1>
      <p className="mt-3">External assessment practice. Work activity by activity, keep evidence, then improve the weak part.</p>
      <p className="assignment-deadline">Current teaching priority: Activity 1 · turn a supplied data extract into sensible tables, identify PKs and FKs, show relationships and gather evidence.</p>
      <p className="assignment-note">The Hub uses original practice material. It is not a copy of a live Pearson task and it does not award an external-assessment mark.</p>

      <details className="mini-study-help mt-5" open>
        <summary>Eight activities across two rehearsal sessions</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{unit2PracticeSessions.map(session=><section className="card" key={session.number}>
          <p className="eyebrow">{session.title}</p>
          <ol className="mt-3 space-y-2">{session.activities.map(item=><li key={item.number}><strong>Activity {item.number}.</strong> {item.title}</li>)}</ol>
        </section>)}</div>
      </details>

      <section className="card mt-6">
        <p className="eyebrow">Activity 1 · what students should practise now</p>
        <h2 className="mt-2 text-2xl font-bold">From raw extract to relational structure</h2>
        <p className="mt-2">Students should be able to look at an unfamiliar extract, decide what the entities are, separate the data into tables, choose primary keys, place foreign keys, describe the relationships and say what screenshots or other evidence prove that the database structure has been created correctly.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["Spot repeated data and entities","Create sensible tables","Choose PKs","Place FKs","State 1:M / other relationships","Plan evidence screenshots"].map(item=><div className="rounded-lg border border-slate-200 p-3 font-semibold" key={item}>{item}</div>)}
        </div>
      </section>

      {groups.length>1&&<nav aria-label="Choose group" className="my-4 flex flex-wrap gap-3">{groups.map(item=><Link key={item.id} className="link" href={`?classId=${item.id}`}>{item.name}</Link>)}</nav>}

      <div id="practice">{group?<><p className="mt-6 font-bold">{group.name}</p><Unit2ExamPractice key={group.id} classId={group.id} staff={staff}/></>:<p className="card mt-6">No accessible Unit 2 group was found. Ask your teacher to check your enrolment.</p>}</div>

      <details className="mini-study-help mt-6">
        <summary>{staff?"Group Unit 2 attempts and self-reviews":"My Unit 2 attempts and self-reviews"} · {attempts.length}</summary>
        <p>Each saved attempt keeps the learner&apos;s original response. The reflection records what they corrected after checking the activity checklist.</p>
        {attempts.map(a=>{
          const learner=Array.isArray(a.user_profiles)?a.user_profiles[0]:a.user_profiles;
          const activity=unit2PracticeActivities[a.activity];
          const source=unit2PracticeScenarios.find(item=>item.id===a.paper_id);
          return <details key={a.id} className="card mt-4">
            <summary className="cursor-pointer font-bold">{staff?`${learner?.display_name??"Learner"} · `:""}Activity {activity?.number??a.activity+1} · {activity?.title??"Unit 2 practice"} · {source?.title??"Practice data"} · {a.reviewed_at?"Self-review completed":"Answer submitted · review next"}</summary>
            <p className="mt-2 text-sm">{new Date(a.submitted_at).toLocaleDateString("en-GB",{timeZone:"Europe/London"})}</p>
            <p className="mt-3 whitespace-pre-wrap">{a.response}</p>
            {staff?<div className="mt-4"><strong>Self-review:</strong><p className="whitespace-pre-wrap">{a.reflection??"No self-review yet."}</p></div>:<div className="mt-4"><ExamReflectionForm id={a.id} initial={a.reflection??""}/></div>}
          </details>;
        })}
        {!attempts.length&&<p>No Unit 2 practice attempts submitted yet.</p>}
      </details>

      <p className="assignment-note">Keep screenshots, database files and other practical evidence in the location your teacher specifies. The written box in the Hub is for planning, reasoning and review, not a replacement for the database artefacts themselves.</p>
    </main>
  </div>;
}

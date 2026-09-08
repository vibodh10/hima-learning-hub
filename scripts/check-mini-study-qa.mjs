// Isolated, explicitly authorised QA fixture only. Never touches a real learner.
import {createClient} from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const learnerId="cb1ba067-e31b-48da-ab27-3963c72f9f81";
const classId="2c5d1d26-d15d-4ccd-b7c0-44948c69552d";
const user=await admin.auth.admin.getUserById(learnerId);
if(user.error||user.data.user?.app_metadata?.qa_run!=="mini-study-20260908"||user.data.user.email!=="mini-qa-student-20260908@example.invalid")throw new Error("QA account guard failed");
const group=await admin.from("classes").select("id,name").eq("id",classId).single();
if(group.error||group.data.name!=="QA ONLY Mini learning 20260908")throw new Error("QA group guard failed");
const sessions=await admin.from("mini_study_sessions").select("id,class_id,lesson_id,kind,status,grade,opened_at,checked_at,completed_at,reward,target_text,needs_help").eq("learner_id",learnerId).order("opened_at");
if(sessions.error)throw sessions.error;
if(sessions.data.some(s=>s.class_id!==classId))throw new Error("QA record outside isolated group");
const mode=process.argv[2]??"inspect";
if(!["inspect","previous-day"].includes(mode))throw new Error("Unsupported QA operation");
if(mode==="previous-day"){
  if(!sessions.data.length||sessions.data.some(s=>s.status!=="completed"))throw new Error("Complete all QA steps before simulating the following day");
  const day=value=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));
  if(!sessions.data.some(s=>day(s.completed_at)===day(Date.now())))throw new Error("No completed QA step today; refusing to shift twice");
  const earlier=value=>value?new Date(new Date(value).getTime()-86400000).toISOString():null;
  for(const session of sessions.data){
    const changed=await admin.from("mini_study_sessions").update({opened_at:earlier(session.opened_at),checked_at:earlier(session.checked_at),completed_at:earlier(session.completed_at)})
      .eq("id",session.id).eq("learner_id",learnerId).eq("class_id",classId).eq("status","completed").select("id").single();
    if(changed.error)throw changed.error;
  }
  console.log(JSON.stringify({operation:"Shifted only labelled QA session timestamps back one day",count:sessions.data.length}));
}else{
  const [points,badges]=await Promise.all([
    admin.from("learner_achievement_point_events").select("id,points,idempotency_key").eq("learner_id",learnerId),
    admin.from("badge_awards").select("id,badge_definitions(title)").eq("learner_id",learnerId),
  ]);
  if(points.error||badges.error)throw points.error??badges.error;
  console.log(JSON.stringify({sessions:sessions.data.map(s=>({...s,grade:s.grade?{correct:s.grade.correct,total:s.grade.total,answers:s.grade.feedback.map(f=>({skill:f.skill,correct:f.correct,recap:f.recap,selectedAnswer:f.selectedAnswer}))}:null})),points:points.data,badges:badges.data}));
}

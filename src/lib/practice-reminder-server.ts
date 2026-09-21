import "server-only";
import {getSessionProfile} from "./auth";
import {createClient} from "./supabase/server";
import {createAdminClient} from "./supabase/admin";
import {allStudyRows} from "./mini-study-evidence";
import {practiceDueSince} from "./practice-reminder";
import {studyDay} from "./mini-study";
export async function practiceReminders(classId:string){
 const actor=await getSessionProfile();if(!actor)throw new Error("Sign in required");
 const client=await createClient();
 if(actor.role!=="student"){const access=await client.rpc("can_manage_class",{class_uuid:classId});if(access.error||!access.data)throw new Error("Group access required");}
 let rosterQuery=client.from("enrolments").select("student_id,enrolled_at").eq("class_id",classId).is("archived_at",null);
 if(actor.role==="student")rosterQuery=rosterQuery.eq("student_id",actor.id);
 const roster=await rosterQuery;if(roster.error)throw new Error("Practice roster unavailable");if(!roster.data?.length)return [];
 const group=await client.from("classes").select("starts_on,ends_on,weekly_learning_days,weekly_learning_day,published,archived_at").eq("id",classId).single();
 if(group.error)throw new Error("Practice timetable unavailable");if(!group.data.published||group.data.archived_at)return [];
 const units=await client.from("class_units").select("unit_id").eq("class_id",classId).eq("active",true).is("archived_at",null);if(units.error)throw new Error("Practice units unavailable");if(!units.data?.length)return [];
 const admin=createAdminClient();const rows=await allStudyRows((from,to)=>{let q=admin.from("mini_study_sessions").select("learner_id,completed_at",{count:"exact"}).eq("class_id",classId).in("unit_id",units.data.map(u=>u.unit_id)).eq("kind","daily").eq("status","completed");if(actor.role==="student")q=q.eq("learner_id",actor.id);return q.order("id").range(from,to);});
 const latest=new Map<string,string>();for(const row of rows){if(row.completed_at){const day=studyDay(new Date(row.completed_at));if(day>(latest.get(row.learner_id)??""))latest.set(row.learner_id,day);}}
 const days=group.data.weekly_learning_days?.length?group.data.weekly_learning_days:[group.data.weekly_learning_day].filter(Boolean);
 return roster.data.flatMap(r=>{const since=practiceDueSince(studyDay(new Date()),days,group.data.starts_on,group.data.ends_on,studyDay(new Date(r.enrolled_at)),latest.get(r.student_id)??null);return since?[{learnerId:r.student_id,since}]:[];});
}

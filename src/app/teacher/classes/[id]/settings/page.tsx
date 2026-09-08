import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {AppHeader} from "@/components/app-header";
import {ClassSettingsForm} from "@/components/class-forms";
import {ClassRegistrationLinkPanel} from "@/components/class-registration-link-panel";
import {studyContentFor} from "@/lib/mini-study-content";

export default async function GroupSettingsPage({params}:{params:Promise<{id:string}>}){
 const actor=await requireRole("teacher","administrator");
 const {id}=await params;
 const client=await createClient();
 const access=await client.rpc("can_manage_class",{class_uuid:id});
 if(access.error||!access.data)notFound();
 const group=await client.from("classes").select("id,name,course_id,academic_period_id,active_unit_id,starts_on,ends_on,weekly_learning_day,weekly_learning_days,published,class_units(unit_id,active,archived_at)").eq("id",id).is("archived_at",null).maybeSingle();
 if(group.error||!group.data)notFound();
 const [courses,units,periods,links,templates]=await Promise.all([
  client.from("courses").select("id,title").eq("active",true).is("archived_at",null).order("title"),
  client.from("units").select("id,course_id,code,title,kind,initial_teaching,status").is("archived_at",null).order("sort_order"),
  client.from("academic_periods").select("id,name,kind,academic_years(name)").is("archived_at",null).order("starts_on"),
  client.rpc("current_class_registration_link",{class_uuid:id}),
  client.from("learning_journey_templates").select("unit_id").eq("status","approved").is("archived_at",null),
 ]);
 const selected=(group.data.class_units??[]).filter(u=>u.active&&!u.archived_at).map(u=>u.unit_id);
 const unit=units.data?.find(u=>u.id===group.data!.active_unit_id&&u.course_id===group.data!.course_id);
 const ready=Boolean(group.data.published&&unit&&unit.status==="approved"&&selected.includes(unit.id)&&studyContentFor(unit.code)&&templates.data?.some(t=>t.unit_id===unit.id));
 const active=links.data?.[0];
 const error=courses.error||units.error||periods.error||links.error||templates.error;
 return <><AppHeader role={actor.role} name={actor.display_name}/><main className="shell max-w-4xl py-8"><Link className="link" href={`/teacher/classes/${id}`}>← {group.data.name}</Link><h1 className="mt-6 text-3xl font-bold">Group setup and joining link</h1><p className="mt-3">Choose only the units you teach. Students receive the current unit automatically; they cannot choose other units.</p>
  {error?<p className="card mt-6" role="alert">Group options could not be loaded. Refresh before changing settings or sharing a registration link.</p>:<>
   <ClassSettingsForm classData={group.data} courses={courses.data??[]} units={units.data??[]} periods={periods.data??[]} selectedUnitIds={selected}/>
   {ready?<ClassRegistrationLinkPanel classId={id} activeLink={active?{id:active.id,expiresAt:active.expires_at,registrationCount:Number(active.registration_count),maxRegistrations:Number(active.max_registrations)}:null}/>:<p className="card mt-6">{!group.data.published||!unit?"Save the group’s units and make them visible before sharing a joining link.":"The current unit’s learning setup is not ready for new registrations yet. Existing records are preserved."}</p>}
  </>}
 </main></>;
}

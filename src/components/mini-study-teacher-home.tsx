import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {CreateClassForm} from "./class-forms";
import {studyContentFor} from "@/lib/mini-study-content";

export async function TeacherHomeDashboard(){
 const client=await createClient();
 const [groups,courses,years]=await Promise.all([
  client.from("classes").select("id,name,published,active_unit_id,enrolments(student_id,archived_at),class_units(unit_id,active,archived_at,units(code,title))").is("archived_at",null).order("name"),
  client.from("courses").select("id,title").eq("active",true).is("archived_at",null).order("title"),
  client.from("academic_years").select("id,name").is("archived_at",null).order("starts_on",{ascending:false}),
 ]);
 return <main className="shell max-w-4xl py-10"><h1 className="text-3xl font-bold">Which group are you checking?</h1><p className="mt-3">Open a group to see starting points, short learning checks and automatic next targets.</p>
  <section id="groups" className="mt-6 grid gap-4" aria-label="Your groups">
   {groups.error?<p className="card" role="alert">Your groups could not be loaded. Please refresh to try again.</p>:groups.data?.length?groups.data.map(group=>{
    const assignment=group.class_units?.find(u=>u.unit_id===group.active_unit_id&&u.active&&!u.archived_at);
    const unit=Array.isArray(assignment?.units)?assignment.units[0]:assignment?.units;
    const count=group.enrolments?.filter(e=>!e.archived_at).length??0;
    const ready=Boolean(group.published&&unit&&studyContentFor(unit.code));
    return <Link key={group.id} href={`/teacher/classes/${group.id}`} className="card block hover:border-purple-500 focus-visible:outline-4 focus-visible:outline-offset-4"><h2 className="text-xl font-bold">{group.name}</h2><p className="mt-2">{count} student{count===1?"":"s"} · {unit?.title??"Choose this group’s units"}</p><p className="mt-3 font-semibold">{ready?"Open learning records →":"Open group setup →"}</p></Link>;
   }):<p className="card">No groups yet. Create one below and choose only the units you teach.</p>}
  </section>
  {courses.error||years.error?<p className="mt-6" role="alert">Group creation options could not be loaded. Please refresh before creating a group.</p>:<CreateClassForm courses={courses.data??[]} years={years.data??[]}/>}
 </main>;
}

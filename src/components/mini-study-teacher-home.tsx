import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {CreateClassForm} from "./class-forms";

export async function TeacherHomeDashboard(){
 const client=await createClient();
 const [groups,courses,years]=await Promise.all([
  client.from("classes")
   .select("id,name,published,enrolments(student_id,archived_at),class_units(active,archived_at,units(code,title))")
   .is("archived_at",null)
   .order("name"),
  client.from("courses").select("id,title").eq("active",true).is("archived_at",null).order("title"),
  client.from("academic_years").select("id,name").is("archived_at",null).order("starts_on",{ascending:false}),
 ]);

 return <main className="shell max-w-4xl py-10">
  <header className="flex flex-wrap items-start justify-between gap-4">
   <div>
    <p className="eyebrow">Teacher dashboard</p>
    <h1 className="mt-2 text-3xl font-bold">Your groups</h1>
    <p className="mt-3 text-slate-600">Choose a group to view its students, progress, starting points, learning activity and reports.</p>
   </div>
   <Link className="button-secondary" href="#create-group">Create another group</Link>
  </header>

  <section id="groups" className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Your groups">
   {groups.error
    ? <p className="card md:col-span-2" role="alert">Your groups could not be loaded. Please refresh to try again.</p>
    : groups.data?.length
      ? groups.data.map(group=>{
        const units=(group.class_units??[])
         .filter(assignment=>assignment.active&&!assignment.archived_at)
         .flatMap(assignment=>{const unit=Array.isArray(assignment.units)?assignment.units[0]:assignment.units;return unit?[unit]:[];});
        const count=group.enrolments?.filter(e=>!e.archived_at).length??0;
        return <Link key={group.id} href={`/teacher/classes/${group.id}`} className="card block min-h-40 hover:border-purple-500 focus-visible:outline-4 focus-visible:outline-offset-4">
         <div className="flex h-full flex-col">
          <h2 className="text-xl font-bold">{group.name}</h2>
          <p className="mt-2 text-slate-600">{count} student{count===1?"":"s"}</p>
          {units.length>0
           ? <p className="mt-3 text-sm text-slate-600">{units.map(unit=>`Unit ${unit.code}: ${unit.title}`).join(" · ")}</p>
           : <p className="mt-3 text-sm text-slate-500">No active unit selected</p>}
          <p className="mt-auto pt-6 font-semibold">Open group →</p>
         </div>
        </Link>;
       })
      : <p className="card md:col-span-2">No groups are available for this teacher account.</p>}
  </section>

  <section id="create-group" className="mt-8 scroll-mt-8">
   {courses.error||years.error
    ? <p className="card" role="alert">Group creation options could not be loaded. Please refresh and try again.</p>
    : <CreateClassForm courses={courses.data??[]} years={years.data??[]}/>}
  </section>
 </main>;
}

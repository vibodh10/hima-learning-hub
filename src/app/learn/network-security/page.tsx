import { AppHeader } from "@/components/app-header";
import { requireCurriculumUnitAccess } from "@/lib/curriculum-access";
import { createClient } from "@/lib/supabase/server";
import { PracticeForm, type PracticeQuestion } from "@/components/practice-form";

export default async function LessonPage() {
  const profile = await requireCurriculumUnitAccess("6");
  const supabase = await createClient();
  const activityId = "70000000-0000-0000-0000-000000000001";
  const { data: activity } = await supabase.from("activities")
    .select("id,title,activity_questions(sort_order,questions(id,kind,question_text,marks,question_options(id,option_text,sort_order)))")
    .eq("id", activityId).single();
  const questions = (activity?.activity_questions ?? [])
    .sort((a,b)=>a.sort_order-b.sort_order)
    .map(item=>item.questions)
    .filter(Boolean) as unknown as PracticeQuestion[];
  return <><AppHeader name={profile.display_name} role={profile.role}/><main className="shell max-w-4xl py-10">
    <p className="eyebrow">Unit 6 · Week 1</p><h1 className="mt-3 text-4xl font-bold">Protecting a college network</h1><div className="mt-8 grid gap-6">
      <Section label="Remember" title="Start with what you know"><p>What do confidentiality, integrity and availability mean for information held by a college?</p></Section>
      <Section label="Learn" title="Controls work better together"><p>A firewall applies rules to network traffic. It can allow expected traffic and block traffic that does not meet policy. Defence in depth combines controls so that one failure does not expose the whole system.</p></Section>
      <Section label="Worked example" title="Separate guest Wi-Fi"><ol className="ml-5 list-decimal space-y-3"><li>Identify the assets and users.</li><li>Place guests in a separate network segment.</li><li>Apply a deny-by-default firewall rule.</li><li>Permit only the internet services guests need.</li><li>Review logs and test the rule.</li></ol></Section>
      <section><div className="mb-5"><p className="eyebrow">Core practice</p><h2 className="mt-2 text-2xl font-bold">Network security check</h2><p className="mt-3 text-slate-600">Five automatically marked questions test firewall rules, segmentation and defence in depth.</p></div>
        {profile.role !== "student" ? <div className="card text-slate-600">Teacher preview: sign in with an enrolled fictional learner account to submit this practice.</div> :
          questions.length === 5 ? <PracticeForm activityId={activityId} questions={questions}/> :
          <div className="card text-slate-600">The practice is unavailable. Apply the database migration and fictional curriculum seed.</div>}
      </section>
    </div>
  </main></>;
}
function Section({label,title,children}:{label:string;title:string;children:React.ReactNode}) { return <section className="card"><p className="eyebrow">{label}</p><h2 className="mt-2 text-2xl font-bold">{title}</h2><div className="mt-4 leading-7 text-slate-700">{children}</div></section>; }

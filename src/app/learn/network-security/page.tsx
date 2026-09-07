import { AppHeader } from "@/components/app-header";
import { redirect } from "next/navigation";
import { requireCurriculumUnitAccess } from "@/lib/curriculum-access";

export default async function LessonPage() {
  const profile = await requireCurriculumUnitAccess("6");
  // This legacy demo predates the Pearson Website Development curriculum.
  if (profile.role === "student") redirect("/curriculum/units/6");
  return <><AppHeader name={profile.display_name} role={profile.role}/><main className="shell max-w-4xl py-10">
    <p className="eyebrow">Unit 6 · Week 1</p><h1 className="mt-3 text-4xl font-bold">Protecting a college network</h1><div className="mt-8 grid gap-6">
      <Section label="Remember" title="Start with what you know"><p>What do confidentiality, integrity and availability mean for information held by a college?</p></Section>
      <Section label="Learn" title="Controls work better together"><p>A firewall applies rules to network traffic. It can allow expected traffic and block traffic that does not meet policy. Defence in depth combines controls so that one failure does not expose the whole system.</p></Section>
      <Section label="Worked example" title="Separate guest Wi-Fi"><ol className="ml-5 list-decimal space-y-3"><li>Identify the assets and users.</li><li>Place guests in a separate network segment.</li><li>Apply a deny-by-default firewall rule.</li><li>Permit only the internet services guests need.</li><li>Review logs and test the rule.</li></ol></Section>
      <section><div className="mb-5"><p className="eyebrow">Core practice</p><h2 className="mt-2 text-2xl font-bold">Network security check</h2><p className="mt-3 text-slate-600">Five automatically marked questions test firewall rules, segmentation and defence in depth.</p></div>
        <div className="card text-slate-600">Legacy teacher preview only. Students are directed to their assigned Pearson unit.</div>
      </section>
    </div>
  </main></>;
}
function Section({label,title,children}:{label:string;title:string;children:React.ReactNode}) { return <section className="card"><p className="eyebrow">{label}</p><h2 className="mt-2 text-2xl font-bold">{title}</h2><div className="mt-4 leading-7 text-slate-700">{children}</div></section>; }

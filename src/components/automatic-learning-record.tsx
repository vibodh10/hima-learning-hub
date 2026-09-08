import { createClient } from "@/lib/supabase/server";

export async function AutomaticLearningRecord({ learnerId, classId, historical=false }: { learnerId: string; classId?: string; historical?:boolean }) {
  const client = await createClient();
  let query = client.from("learner_automation_summaries")
    .select("class_id,feedback,appreciation,updated_at,targets(target_text,status,target_date),classes(name)")
    .eq("learner_id", learnerId);
  if (classId) query = query.eq("class_id", classId);
  const { data, error } = await query;
  if (error) return <p role="status" className="card mt-6">Automatic records could not be loaded. Refresh to try again.</p>;
  if (!data?.length) return <p className="card mt-6 text-slate-600">{historical?"No earlier automatic target record was saved.":"Automatic targets will appear when the group’s learning journey starts."}</p>;
  return <section className="card mt-6" aria-label="Automatic learning records">
    <p className="eyebrow">{historical?"Preserved earlier-system summary":"Updated automatically from recorded work"}</p>
    <h2 className="mt-2 text-2xl font-bold">{historical?"Earlier target and feedback":"Target, feedback and encouragement"}</h2>
    <p className="mt-2 text-sm text-slate-600">{historical?"Opening this history does not generate new targets. Use the group’s short-study records for the current next target.":"No forms or teacher approval needed. Targets update as work is saved and records are opened."}</p>
    {data.map(row => {
      const target = Array.isArray(row.targets) ? row.targets[0] : row.targets;
      const group = Array.isArray(row.classes) ? row.classes[0] : row.classes;
      return <article className="mt-5 border-t border-slate-200 pt-5" key={row.class_id}>
        {data.length > 1 && <h3 className="mb-2 font-semibold">{group?.name}</h3>}
        <p className="font-semibold">{target?.target_text ?? "Your currently available practice targets are complete."}</p>
        {target && <p className="mt-2 text-sm text-slate-600">Review by {new Date(`${target.target_date}T12:00:00`).toLocaleDateString("en-GB")}</p>}
        <p className="mt-4 leading-7">{row.feedback}</p>
        {row.appreciation && <p className="mt-4 rounded-xl bg-teal-50 p-4 text-teal-950">{row.appreciation}</p>}
      </article>;
    })}
  </section>;
}

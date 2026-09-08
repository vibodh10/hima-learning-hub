import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CurriculumLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireRole("student", "teacher", "administrator");
  if(actor.role==="student") redirect("/study");
  return <>
    <AppHeader name={actor.display_name} role={actor.role} />
    <div className="shell pt-6"><aside className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><strong>Staff content library.</strong> Students receive a short assigned self-study step. This library preserves the wider teaching resources.</aside></div>
    {children}
  </>;
}

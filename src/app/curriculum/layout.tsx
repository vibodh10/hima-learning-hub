import { AppHeader } from "@/components/app-header";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CurriculumLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireRole("student", "teacher", "administrator");
  return <>
    <AppHeader name={actor.display_name} role={actor.role} />
    {actor.role!=="student"&&<div className="shell pt-6"><aside className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><strong>Course-content preview.</strong> You are viewing the learning materials students use. Return to your dashboard or a class page for student progress, assessments and teaching actions.</aside></div>}
    {children}
  </>;
}

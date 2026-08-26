import type { Role } from "@/lib/auth";

const content: Record<Role, { label: string; description: string; colour: string }> = {
  student: {
    label: "Student mode",
    description: "Your course, assessments, progress and next actions only.",
    colour: "border-teal-200 bg-teal-50 text-teal-950",
  },
  teacher: {
    label: "Teacher mode",
    description: "Your classes, students, assessment evidence and teaching actions.",
    colour: "border-blue-200 bg-blue-50 text-blue-950",
  },
  administrator: {
    label: "Administrator mode",
    description: "Organisation-wide curriculum, user and governance controls.",
    colour: "border-violet-200 bg-violet-50 text-violet-950",
  },
};

export function RoleBanner({ role }: { role: Role }) {
  const item = content[role];
  return <aside className={`rounded-2xl border px-5 py-4 ${item.colour}`} aria-label={item.label}>
    <p className="text-xs font-black uppercase tracking-[.16em]">{item.label}</p>
    <p className="mt-1 text-sm">{item.description}</p>
  </aside>;
}

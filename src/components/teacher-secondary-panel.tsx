import type { ReactNode } from "react";

export function TeacherSecondaryPanel({ children }: { children: ReactNode }) {
  return <details className="card mt-6" data-testid="teacher-secondary-panel">
    <summary className="cursor-pointer text-lg font-bold">View detailed evidence and optional tools</summary>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">The learner summary and downloadable reports above are enough for an everyday check. Open this section only when you need on-screen starting-point evidence, topic detail, question history, feedback cycles, targets or exceptional controls.</p>
    <div className="mt-5 grid gap-6">{children}</div>
  </details>;
}

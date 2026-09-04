import type { ReactNode } from "react";

export function ClassOnboardingPanel({
  studentCount,
  awaitingCount,
  children,
}: {
  studentCount: number;
  awaitingCount: number;
  children: ReactNode;
}) {
  if (studentCount === 0) {
    return <div id="invitation-status">{children}</div>;
  }

  return <details className="card mt-6" id="invitation-status" data-testid="class-onboarding-panel">
    <summary className="cursor-pointer text-lg font-bold">
      Add more students and manage access
      {awaitingCount > 0 && <span className="ml-2 text-sm font-normal text-slate-500">{awaitingCount} awaiting response</span>}
    </summary>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
      Your student progress remains the main view. Open this section only when you need to share a registration link or check existing access.
    </p>
    {children}
  </details>;
}

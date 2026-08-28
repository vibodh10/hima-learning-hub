"use client";

import { useEffect, useTransition } from "react";
import { saveDatabaseActivityPosition } from "@/app/actions/learning";

export function ActivityPositionTracker({
  lessonId,
  activityId,
}: {
  lessonId: string;
  activityId: string;
}) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      await saveDatabaseActivityPosition(lessonId, activityId);
    });
  }, [activityId, lessonId]);

  return pending
    ? <p className="sr-only" role="status">Saving this activity as your continuation point.</p>
    : null;
}

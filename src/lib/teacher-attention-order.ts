type Attention = { attention_status: string; current_score: number | null; starting_score: number | null; display_name: string };
const priority: Record<string, number> = { intervention_required: 0, action_required: 1, catch_up_required: 2 };

/** Keep urgent help first, then lowest available score; missing evidence is not zero. */
export function sortTeacherAttention<T extends Attention>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const urgency = (priority[a.attention_status] ?? 3) - (priority[b.attention_status] ?? 3);
    const aScore = a.current_score ?? a.starting_score;
    const bScore = b.current_score ?? b.starting_score;
    return urgency || (aScore == null ? (bScore == null ? 0 : -1) : bScore == null ? 1 : aScore - bScore)
      || a.display_name.localeCompare(b.display_name);
  });
}

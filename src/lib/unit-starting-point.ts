type StartingPointProgressRow = {
  unit_code: string;
  topic_code: string;
  evidence: unknown;
};

/**
 * A unit starting point is complete only when every configured topic has the
 * minimum number of independent, unhinted diagnostic responses. A page view,
 * one correct answer, or a partial diagnostic must never unlock ordinary
 * learning.
 */
export function hasCompleteUnitStartingPoint(
  rows: StartingPointProgressRow[],
  unitCode: string,
  topicCodes: string[],
  minimumPerTopic = 3,
) {
  if (!topicCodes.length) return false;
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.unit_code !== unitCode || !topicCodes.includes(row.topic_code) || !Array.isArray(row.evidence)) continue;
    const valid = row.evidence.filter(item => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const record = item as Record<string, unknown>;
      return record.kind === "initial_diagnostic"
        && record.unitCode === unitCode
        && record.topicCode === row.topic_code
        && record.independent === true
        && Number(record.hintsUsed ?? 0) === 0;
    }).length;
    counts.set(row.topic_code, Math.max(counts.get(row.topic_code) ?? 0, valid));
  }
  return topicCodes.every(topicCode => (counts.get(topicCode) ?? 0) >= minimumPerTopic);
}

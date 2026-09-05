export function averageCurrentClassScore(rows: { currentScore: number | null }[]) {
  const recorded = rows
    .filter(row => row.currentScore != null)
    .map(row => Number(row.currentScore));

  if (!recorded.length) return null;
  return Math.round(recorded.reduce((total, score) => total + score, 0) / recorded.length);
}

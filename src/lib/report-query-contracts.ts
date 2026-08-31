/**
 * Keep embedded relation fields aligned with the deployed achievement schema.
 * Supabase validates these select strings at runtime rather than at compile time.
 */
export const CERTIFICATE_ELIGIBILITY_REVIEW_SELECT =
  "id,status,eligible_at,reviewed_at,review_note,achievement_levels(title,threshold)";

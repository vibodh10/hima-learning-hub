export const requestedTeacherNames = [
  "Robert Thacker",
  "Lee Thomas",
  "Ruhail Rana",
  "Joan Jones",
  "Julie Harris",
  "Kevin Marriott",
] as const;

export type RequestedTeacherName = (typeof requestedTeacherNames)[number];

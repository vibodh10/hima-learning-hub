import type { Role } from "@/lib/auth";

export function canPerformTeachingAction(role: Role) {
  return role === "teacher" || role === "administrator";
}
export function canJoinClass(role: Role) {
  return role === "student";
}
export function canSubmitPractice(role: Role) {
  return role === "student";
}
export function canViewLearnerEvidence(role: Role) {
  return role === "teacher" || role === "administrator";
}
export function canManageCurriculumConfiguration(role: Role) {
  return role === "administrator";
}
export function canSetUpOwnedGroup(role: Role) {
  return role === "teacher" || role === "administrator";
}
export function canPerformAdministratorAction(role: Role) {
  return role === "administrator";
}

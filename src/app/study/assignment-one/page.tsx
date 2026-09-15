import {requireRole} from "@/lib/auth";
import {requireCurriculumUnitAccess} from "@/lib/curriculum-access";
import {assignmentSchedule} from "@/lib/assignment-one";
import {AssignmentOneGuide} from "@/components/assignment-one-guide";

export default async function AssignmentOnePage() {
  await requireRole("student","teacher","administrator");
  await requireCurriculumUnitAccess("6");
  return <AssignmentOneGuide schedule={assignmentSchedule(new Date())}/>;
}

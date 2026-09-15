import {requireRole} from "@/lib/auth";
import {requireCurriculumUnitAccess} from "@/lib/curriculum-access";
import {assignmentSchedule} from "@/lib/assignment-one";
import {programmingSteps} from "@/lib/programming-assignment-one";
import {AssignmentOneGuide} from "@/components/assignment-one-guide";

export default async function ProgrammingAssignmentOnePage() {
  await requireRole("student","teacher","administrator");
  await requireCurriculumUnitAccess("4");
  return <AssignmentOneGuide unit="4" schedule={assignmentSchedule(new Date(),programmingSteps)}/>;
}

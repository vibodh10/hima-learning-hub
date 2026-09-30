import {requireRole} from "@/lib/auth";
import {requireCurriculumUnitAccess} from "@/lib/curriculum-access";
import {Unit6AssignmentWorkshop} from "@/components/unit6-assignment-workshop";

export default async function AssignmentOnePage() {
  await requireRole("student","teacher","administrator");
  await requireCurriculumUnitAccess("6");
  return <Unit6AssignmentWorkshop/>;
}

import {notFound} from "next/navigation";
import {assignmentSchedule} from "@/lib/assignment-one";
import {AssignmentOneGuide} from "@/components/assignment-one-guide";

export default function AssignmentOnePreview() {
  if(process.env.NODE_ENV!=="development") notFound();
  return <AssignmentOneGuide schedule={assignmentSchedule(new Date())} preview/>;
}

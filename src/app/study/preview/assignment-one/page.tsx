import {notFound} from "next/navigation";
import {Unit6AssignmentWorkshop} from "@/components/unit6-assignment-workshop";

export default function AssignmentOnePreview() {
  if(process.env.NODE_ENV!=="development") notFound();
  return <Unit6AssignmentWorkshop preview/>;
}

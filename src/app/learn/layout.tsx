import {redirect} from "next/navigation";
import {requireRole} from "@/lib/auth";

export default async function LearningLayout({children}:{children:React.ReactNode}) {
  const actor=await requireRole("student","teacher","administrator");
  if(actor.role==="student")redirect("/study");
  return children;
}

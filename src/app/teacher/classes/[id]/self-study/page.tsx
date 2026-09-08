import {redirect} from "next/navigation";
import {requireRole} from "@/lib/auth";
export default async function SelfStudyReportPage({params}:{params:Promise<{id:string}>}){
 await requireRole("teacher","administrator");
 const {id}=await params;
 redirect(`/teacher/classes/${id}`);
}

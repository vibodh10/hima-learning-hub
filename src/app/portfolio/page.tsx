import {redirect} from "next/navigation";
import {requireRole} from "@/lib/auth";

// Historical records remain available in authorised teacher reports.
export default async function PortfolioPage() {
  await requireRole("student");
  redirect("/study");
}

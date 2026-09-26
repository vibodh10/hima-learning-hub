import {z} from "zod";
import {getSessionProfile} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {loadMiniStudyEvidence} from "@/lib/mini-study-evidence";
import {buildFormativeCohortSummary,formativeCohortCsv} from "@/lib/formative-cohort-report";

const headers={"Cache-Control":"private, no-store","Vary":"Cookie","X-Content-Type-Options":"nosniff"};
const message=(text:string,status:number)=>new Response(text,{status,headers});
function related<T>(value:T|T[]|null):T|undefined{return Array.isArray(value)?value[0]:value??undefined;}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getSessionProfile();
  if(!actor)return message("Please sign in to download this report.",401);
  if(!["teacher","administrator"].includes(actor.role))return message("Not authorised.",403);
  const parsed=z.string().uuid().safeParse((await params).id);
  if(!parsed.success)return message("Group not found.",404);
  const unitId=new URL(request.url).searchParams.get("unitId");
  if(!unitId||!z.string().uuid().safeParse(unitId).success)return message("Unit not found.",404);
  const id=parsed.data;
  const client=await createClient();
  const {data:allowed,error:accessError}=await client.rpc("can_manage_class",{class_uuid:id});
  if(accessError||!allowed)return message("Group not found or not authorised.",404);
  const [{data:group},{data:classUnit}]=await Promise.all([
    client.from("classes").select("name").eq("id",id).is("archived_at",null).maybeSingle(),
    client.from("class_units").select("unit_id,units!inner(code,title)").eq("class_id",id).eq("unit_id",unitId).maybeSingle(),
  ]);
  if(!group||!classUnit)return message("Group or unit not found.",404);
  const unit=related(classUnit.units);if(!unit)return message("Unit not found.",404);
  try{
    const evidence=await loadMiniStudyEvidence(client,id,[unitId]);
    const summary=buildFormativeCohortSummary(evidence.learners,evidence.records,unitId);
    const csv=formativeCohortCsv(group.name,`Unit ${unit.code}: ${unit.title}`,summary);
    return new Response(csv,{headers:{...headers,
      "Content-Type":"text/csv; charset=utf-8",
      "Content-Disposition":'attachment; filename="formative-assessment-cohort.csv"'
    }});
  }catch{
    return message("The cohort report could not be loaded completely. Please refresh and try again.",503);
  }
}

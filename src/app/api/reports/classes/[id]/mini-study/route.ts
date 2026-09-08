import {z} from "zod";
import {getSessionProfile} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {loadMiniStudyEvidence} from "@/lib/mini-study-evidence";
import {miniStudyCsv} from "@/lib/mini-study-csv";

const headers={"Cache-Control":"private, no-store","Vary":"Cookie","X-Content-Type-Options":"nosniff"};
const message=(text:string,status:number)=>new Response(text,{status,headers});

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const actor=await getSessionProfile();
  if(!actor)return message("Please sign in to download this report.",401);
  if(!["teacher","administrator"].includes(actor.role))return message("Not authorised.",403);
  const parsed=z.string().uuid().safeParse((await params).id);
  if(!parsed.success)return message("Group not found.",404);
  const id=parsed.data;
  const client=await createClient();
  const allowed=await client.rpc("can_manage_class",{class_uuid:id});
  if(allowed.error||!allowed.data)return message("Group not found or not authorised.",404);
  const group=await client.from("classes").select("name,active_unit_id").eq("id",id).is("archived_at",null).maybeSingle();
  if(group.error||!group.data)return message("Group not found.",404);
  if(!group.data.active_unit_id)return message("Choose this group's current unit before downloading its report.",409);
  try{
    const evidence=await loadMiniStudyEvidence(client,id,group.data.active_unit_id);
    return new Response(miniStudyCsv(group.data.name,evidence.learners,evidence.records,evidence.baselines),{headers:{...headers,
      "Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="short-study-records.csv"'}});
  }catch{return message("The complete report could not be loaded. Please refresh and try again; no partial report has been downloaded.",503);}
}

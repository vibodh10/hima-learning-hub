import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { csvCell } from "@/lib/report";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getSessionProfile();
  if (!actor) return new Response("Authentication required.", { status: 401 });
  if (!["teacher","administrator"].includes(actor.role)) return new Response("Not authorised.", { status: 403 });
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: classData } = await supabase.from("classes").select(
    "id,name,courses(title),units:class_units(unit_id,units(title)),enrolments(student_id,user_profiles!enrolments_student_id_fkey(display_name))",
  ).eq("id",id).single();
  if (!classData) return new Response("Class not found or not authorised.", { status: 404 });
  const learnerIds=(classData.enrolments??[]).map(row=>row.student_id);
  const [{data:progress},{data:mastery},{data:comparisons},{data:misconceptions},{data:actions},{data:allocations},{data:attempts}]=learnerIds.length?await Promise.all([
    supabase.from("topic_progress").select("learner_id,first_score,latest_score,current_pathway,topics(title)").in("learner_id",learnerIds),
    supabase.from("skill_mastery").select("learner_id,mastery_score,current_pathway,skills(title)").in("learner_id",learnerIds),
    supabase.from("skill_progress_comparisons").select("learner_id,improvement_points,status,skills(title)").in("learner_id",learnerIds),
    supabase.from("learner_misconceptions").select("learner_id,occurrence_count,misconceptions(title)").in("learner_id",learnerIds),
    supabase.from("teacher_actions").select("learner_id,action,reason,created_at").eq("class_id",id).is("archived_at",null),
    supabase.from("activity_allocations").select("id,activity_id,deadline_at,activities(title,kind)").eq("class_id",id).is("archived_at",null),
    supabase.from("attempts").select("learner_id,activity_id,percentage,completed_at").in("learner_id",learnerIds).not("completed_at","is",null),
  ]):[{data:[]},{data:[]},{data:[]},{data:[]},{data:[]},{data:[]},{data:[]}];
  const names=new Map((classData.enrolments??[]).map(row=>[row.student_id,related(row.user_profiles)?.display_name??"Learner"]));
  const rows=learnerIds.map(learnerId=>{
    const learnerProgress=(progress??[]).filter(row=>row.learner_id===learnerId);
    const learnerMastery=(mastery??[]).filter(row=>row.learner_id===learnerId);
    const learnerComparisons=(comparisons??[]).filter(row=>row.learner_id===learnerId);
    const completed=new Set((attempts??[]).filter(row=>row.learner_id===learnerId).map(row=>row.activity_id));
    const overdue=(allocations??[]).filter(row=>!completed.has(row.activity_id)&&row.deadline_at&&new Date(row.deadline_at)<new Date()).length;
    return {
      learner:names.get(learnerId)??"Learner",
      starting:average(learnerProgress.map(row=>Number(row.first_score))),
      latest:average(learnerProgress.map(row=>Number(row.latest_score))),
      improvement:average(learnerComparisons.map(row=>Number(row.improvement_points)).filter(Number.isFinite)),
      support:learnerMastery.filter(row=>row.current_pathway==="Support").length,
      mastery:learnerMastery.filter(row=>row.current_pathway==="Mastery").length,
      completed:completed.size,overdue,
    };
  });
  const evidence={
    name:classData.name,course:related(classData.courses)?.title??"Course",
    units:(classData.units??[]).map(row=>related(row.units)?.title).filter(Boolean),
    rows,misconceptions:misconceptions??[],actions:actions??[],
    generatedAt:new Date().toISOString(),
  };
  const format=new URL(request.url).searchParams.get("format");
  const safeName=classData.name.replace(/[^a-z0-9]+/gi,"-").toLowerCase();
  if(format==="csv"){
    const csv=[
      ["Learner","Starting point","Latest progress","Improvement points","Support skills","Mastery skills","Activities completed","Overdue"],
      ...rows.map(row=>[row.learner,row.starting??"",row.latest??"",row.improvement??"",row.support,row.mastery,row.completed,row.overdue]),
    ].map(row=>row.map(csvCell).join(",")).join("\r\n");
    return new Response(csv,{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":`attachment; filename="${safeName}-class-progress.csv"`,"cache-control":"private, no-store"}});
  }
  const bytes=await buildClassPdf(evidence);
  return new Response(bytes as BodyInit,{headers:{"content-type":"application/pdf","content-disposition":`attachment; filename="${safeName}-class-progress.pdf"`,"cache-control":"private, no-store"}});
}

type Report={name:string;course:string;units:(string|undefined)[];rows:{learner:string;starting:number|null;latest:number|null;improvement:number|null;support:number;mastery:number;completed:number;overdue:number}[];misconceptions:{occurrence_count:number;misconceptions:{title:string}[]|null}[];actions:{action:string;reason:string;created_at:string}[];generatedAt:string};
async function buildClassPdf(data:Report){
  const pdf=await PDFDocument.create();const regular=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  let page=pdf.addPage([595,842]);let y=790;
  const line=(text:string,size=10,strong=false)=>{for(const part of wrap(text,92)){if(y<55){page=pdf.addPage([595,842]);y=790}page.drawText(part,{x:48,y,size,font:strong?bold:regular,color:rgb(.08,.14,.17)});y-=size+6;}};
  line("Class Progress Report",20,true);line(`Class: ${data.name}`,12,true);line(`Course: ${data.course}`);line(`Active units: ${data.units.join(", ")||"Not selected"}`);line(`Generated: ${new Date(data.generatedAt).toLocaleString("en-GB")}`,9);
  y-=8;line("Learner progress from starting points",14,true);
  if(data.rows.length)data.rows.forEach(row=>line(`${row.learner}: starting ${row.starting??"not recorded"}%, latest ${row.latest??"not recorded"}%, change ${row.improvement??"not calculated"} points; ${row.support} Support skills, ${row.mastery} Mastery skills; ${row.completed} activities completed, ${row.overdue} overdue.`));
  else line("No active learners.");
  y-=8;line("Common misconceptions",14,true);
  if(data.misconceptions.length)data.misconceptions.slice(0,10).forEach(row=>line(`${related(row.misconceptions)?.title??"Misconception"}: ${row.occurrence_count} recorded occurrences.`));
  else line("No tagged misconceptions recorded.");
  y-=8;line("Teacher actions and interventions",14,true);
  if(data.actions.length)data.actions.forEach(action=>line(`${new Date(action.created_at).toLocaleDateString("en-GB")} - ${action.action}: ${action.reason}`));
  else line("No teacher actions recorded.");
  y-=12;line("This factual report covers formative learning and progress evidence only. Formal qualification assignments and grades are outside Hima Learning Hub.",8);
  return pdf.save();
}
function average(values:number[]){return values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length*10)/10:null}
function related<T>(value:T|T[]|null|undefined):T|undefined{return Array.isArray(value)?value[0]:value??undefined}
function wrap(text:string,width:number){const words=text.replace(/[^\x20-\x7E]/g,"-").split(/\s+/);const lines:string[]=[];let current="";for(const word of words){if((current+" "+word).trim().length>width){lines.push(current);current=word}else current=(current+" "+word).trim()}if(current)lines.push(current);return lines}

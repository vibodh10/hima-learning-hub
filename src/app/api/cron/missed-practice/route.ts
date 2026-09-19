import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {practiceExpectationForLearner,practiceWeekEnd,practiceWeekStart,type PracticeMiss} from "@/lib/mini-study-attendance";
import {safeEmailText,sendHimaEmail} from "@/lib/hima-email";

function authorised(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret)return false;
  return request.headers.get("authorization")===`Bearer ${secret}`;
}
function evidenceWeek(value:unknown){
  if(!value||typeof value!=="object"||Array.isArray(value))return "";
  const week=(value as Record<string,unknown>).week_start;
  return typeof week==="string"?week:"";
}

export async function POST(request:Request){
  if(!authorised(request))return NextResponse.json({ok:false,error:"unauthorised"},{status:401});
  const admin=createAdminClient();
  const learners=new Set<string>();
  for(let from=0;from<10000;from+=200){
    const {data,error}=await admin.from("enrolments")
      .select("student_id,classes!inner(published,archived_at)")
      .is("archived_at",null).eq("classes.published",true).is("classes.archived_at",null)
      .order("student_id").range(from,from+199);
    if(error)return NextResponse.json({ok:false,error:"roster_load_failed"},{status:500});
    for(const row of data??[])learners.add(row.student_id);
    if((data??[]).length<200)break;
  }

  let checked=0,missesCreated=0,learnerEmails=0,interventionsCreated=0,teacherEmails=0;
  for(const learnerId of learners){
    checked+=1;
    const expectation=await practiceExpectationForLearner(learnerId).catch(()=>null);
    if(!expectation?.required||!expectation.classId)continue;
    const day=expectation.day;
    const weekStart=practiceWeekStart(day),weekEnd=practiceWeekEnd(day);
    let {data:miss}=await admin.from("mini_study_practice_misses").select("*")
      .eq("learner_id",learnerId).eq("class_id",expectation.classId).eq("missed_on",day).maybeSingle();
    if(!miss){
      const inserted=await admin.from("mini_study_practice_misses").insert({
        learner_id:learnerId,class_id:expectation.classId,unit_id:expectation.unitId??null,missed_on:day,
      }).select("*").single();
      if(inserted.error||!inserted.data)continue;
      miss=inserted.data;missesCreated+=1;
    }
    const currentMiss=miss as PracticeMiss;
    const [{data:profile},{data:authUser},{data:group}]=await Promise.all([
      admin.from("user_profiles").select("display_name").eq("id",learnerId).maybeSingle(),
      admin.auth.admin.getUserById(learnerId),
      admin.from("classes").select("name,teacher_id").eq("id",expectation.classId).maybeSingle(),
    ]);
    const learnerName=profile?.display_name??"Learner";
    if(!currentMiss.learner_notified_at&&authUser.user?.email){
      const sent=await sendHimaEmail(authUser.user.email,"Digital Learning Hub practice reminder",`<p>Hello ${safeEmailText(learnerName)},</p><p>A required Digital Learning Hub practice step was still incomplete at the end of ${safeEmailText(day)}. A red missed-practice badge has been added for this week.</p><p>Please sign in and continue your saved step. The Digital Learning Hub will choose the practice or assessment you need next automatically.</p><p>This badge records a missed practice day; it is not a grade or judgement of ability.</p>`);
      if(sent){await admin.from("mini_study_practice_misses").update({learner_notified_at:new Date().toISOString()}).eq("id",currentMiss.id);learnerEmails+=1;}
    }

    const {data:weekRows}=await admin.from("mini_study_practice_misses").select("*")
      .eq("learner_id",learnerId).eq("class_id",expectation.classId).gte("missed_on",weekStart).lte("missed_on",weekEnd).order("missed_on");
    const weekMisses=(weekRows??[]) as PracticeMiss[];
    if(weekMisses.length<3)continue;
    const {data:openInterventions}=await admin.from("interventions").select("id,evidence")
      .eq("learner_id",learnerId).eq("class_id",expectation.classId).eq("kind","missed_self_study").eq("status","open");
    let intervention=(openInterventions??[]).find(row=>evidenceWeek(row.evidence)===weekStart);
    let created=false;
    if(!intervention){
      const inserted=await admin.from("interventions").insert({
        learner_id:learnerId,class_id:expectation.classId,kind:"missed_self_study",status:"open",
        evidence:{week_start:weekStart,week_end:weekEnd,miss_count:weekMisses.length,missed_dates:weekMisses.map(item=>item.missed_on),source:"automated_practice_monitor"},
        note:"Three or more required Digital Learning Hub practice days were missed in the same school week. Review the pattern with the learner and record support or contact as appropriate. The attendance badges are not a judgement of ability.",
      }).select("id,evidence").single();
      if(!inserted.error&&inserted.data){intervention=inserted.data;created=true;interventionsCreated+=1;}
    }
    if(created&&group?.teacher_id){
      const teacherAuth=await admin.auth.admin.getUserById(group.teacher_id);
      if(teacherAuth.data.user?.email){
        const sent=await sendHimaEmail(teacherAuth.data.user.email,`Digital Learning Hub teacher attention: ${learnerName}`,`<p>${safeEmailText(learnerName)} has ${weekMisses.length} missed-practice badges for the week beginning ${safeEmailText(weekStart)}${group.name?` in ${safeEmailText(group.name)}`:""}.</p><p>The Digital Learning Hub has opened a teacher intervention record. Please review the learner's practice and assessment evidence, check for barriers, and record any support or contact you decide is appropriate.</p><p>The missed-practice badges are attendance evidence only and do not determine ability or behaviour.</p>`);
        if(sent){await admin.from("mini_study_practice_misses").update({teacher_notified_at:new Date().toISOString()}).eq("id",currentMiss.id);teacherEmails+=1;}
      }
    }
  }
  return NextResponse.json({ok:true,checked,missesCreated,learnerEmails,interventionsCreated,teacherEmails});
}

import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import {
  ActivityEditorForm, AllocationForm, AssessmentBlueprintForm, ContentStatusForm,
  GamificationForm, LessonEditorForm, QuestionEditorForm, QuestionReviewForm,
} from "@/components/content-editor-forms";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CurriculumExplorer } from "@/components/curriculum-explorer";
import { AcademicCalendarForm } from "@/components/academic-calendar-form";

export default async function ContentEditorPage() {
  const actor = await requireRole("teacher", "administrator");
  const supabase = await createClient();
  const [
    { data: lesson }, { data: topics }, { data: skills }, { data: activities },
    { data: classes }, { data: draftQuestions }, { data: allocations },
    { data: courses }, { data: units }, { data: aims }, { data: classUnits },
    { data: topicProgress }, { data: misconceptions }, { data: questionCoverage },
    { data: allLessons }, {data:curriculumVersions}, {data:blueprints},
    {data:misconceptionDefinitions},{data:academicYears},{data:academicPeriods},
    {data:calendarEvents},
  ] = await Promise.all([
    supabase.from("lessons").select("id,topic_id,week_number,title,learn,remember,worked_example,reflection_prompt,language,objectives,estimated_minutes,status").eq("id", "61000000-0000-0000-0000-000000000001").maybeSingle(),
    supabase.from("topics").select("id,unit_id,learning_aim_id,title,status,units(code,title)").is("archived_at", null).order("sort_order"),
    supabase.from("skills").select("id,topic_id,title,topics(title)").is("archived_at", null).order("sort_order"),
    supabase.from("activities").select("id,lesson_id,title,learning_stage,status,lessons(title)").is("archived_at", null).order("title"),
    supabase.from("classes").select("id,name").eq("teacher_id", actor.id).is("archived_at", null).order("name"),
    supabase.from("questions").select("id,question_text,kind,pathway,status,explanation,feedback_correct,feedback_incorrect,hint,marks,estimated_seconds,blueprint_id,blueprint_category,tags,skills(title),question_options(option_text),question_misconceptions(misconception_id)").eq("status", "draft").is("archived_at", null).order("updated_at", { ascending: false }).limit(20),
    supabase.from("activity_allocations").select("id,release_at,deadline_at,allocated_pathway,required,activities(title),classes(name)").is("archived_at", null).order("created_at", { ascending: false }).limit(10),
    supabase.from("courses").select("id,title,qualification_type").order("title"),
    supabase.from("units").select("id,course_id,code,title,kind").is("archived_at",null).order("sort_order"),
    supabase.from("learning_aims").select("id,unit_id,title").is("archived_at",null).order("sort_order"),
    supabase.from("class_units").select("class_id,unit_id,classes(name)").eq("active",true).is("archived_at",null),
    supabase.from("topic_progress").select("topic_id,latest_score,current_pathway"),
    supabase.from("learner_misconceptions").select("occurrence_count,misconceptions(title,skills(topic_id))").is("resolved_at",null),
    supabase.from("questions").select("id,skill_id,status").is("archived_at",null),
    supabase.from("lessons").select("id,topic_id,title,status").is("archived_at",null).order("week_number"),
    supabase.from("curriculum_versions").select("id,version_label,courses(title)").eq("active",true).is("archived_at",null).order("created_at"),
    supabase.from("assessment_blueprints").select("id,title,scope").eq("status","approved").is("archived_at",null).order("title"),
    supabase.from("misconceptions").select("id,title,skills(title)").order("title"),
    supabase.from("academic_years").select("id,name").is("archived_at",null).order("starts_on",{ascending:false}),
    supabase.from("academic_periods").select("id,name,academic_year_id").is("archived_at",null).order("starts_on"),
    supabase.from("academic_calendar_events").select("id,academic_year_id,academic_period_id,title,kind,starts_on,ends_on,metadata").is("archived_at",null).order("starts_on").limit(50),
  ]);
  const topicOptions = (topics ?? []).map(topic => ({ id: topic.id, title: `${related(topic.units)?.code ?? ""} · ${topic.title}` }));
  const skillOptions = (skills ?? []).map(skill => ({ id: skill.id, title: `${related(skill.topics)?.title ?? ""} · ${skill.title}` }));
  const activityOptions = (activities ?? []).map(activity => ({ id: activity.id, title: `${formatStage(activity.learning_stage)} · ${activity.title}` }));
  const classOptions = (classes ?? []).map(item => ({ id: item.id, title: item.name }));

  return <><AppHeader name={actor.role === "teacher" ? "Hima" : actor.display_name} role={actor.role}/><main className="shell py-10">
    <Link className="link" href="/dashboard">← Teacher dashboard</Link>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Controlled curriculum</p><h1 className="mt-2 text-4xl font-bold">Learning content and allocation</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Content is stored in the question bank, mapped to curriculum skills, and student-visible only after approval. Draft placeholders remain hidden.</p></div><Link className="button-secondary" href="/learn/61000000-0000-0000-0000-000000000001">Preview as a student</Link></div>

    <nav className="mt-8 flex flex-wrap gap-3 text-sm"><a className="button-secondary" href="#lesson">Lesson</a><a className="button-secondary" href="#questions">Question bank</a><a className="button-secondary" href="#review">Draft review</a><a className="button-secondary" href="#allocation">Allocation</a><a className="button-secondary" href="#calendar">Calendar</a><a className="button-secondary" href="#settings">Gamification</a></nav>

    <CurriculumExplorer
      courses={courses??[]}
      units={units??[]}
      aims={aims??[]}
      topics={(topics??[]).map(topic=>({id:topic.id,unit_id:topic.unit_id,learning_aim_id:topic.learning_aim_id,title:topic.title,status:topic.status}))}
      skills={(skills??[]).map(skill=>({id:skill.id,topic_id:skill.topic_id,title:skill.title}))}
      lessons={allLessons??[]}
      activities={(activities??[]).map(activity=>({id:activity.id,lesson_id:activity.lesson_id,title:activity.title,learning_stage:activity.learning_stage,status:activity.status}))}
      questions={questionCoverage??[]}
      classUnits={classUnits??[]}
      progress={topicProgress??[]}
      misconceptions={(misconceptions??[]).map(item=>({
        title:related(item.misconceptions)?.title??"Misconception",
        skills:related(item.misconceptions)?.skills??null,
        occurrence_count:item.occurrence_count,
      }))}
    />

    <section className="card mt-8" id="lesson"><p className="eyebrow">Lesson editor</p><h2 className="mt-2 text-2xl font-bold">Edit the approved Python pilot</h2><p className="mb-6 mt-2 text-sm text-slate-600">Saving as draft immediately removes it from student visibility while retaining historic results.</p>
      <LessonEditorForm topics={topicOptions} lesson={lesson ? {
        id: lesson.id, topicId: lesson.topic_id, weekNumber: lesson.week_number, title: lesson.title,
        learn: lesson.learn, remember: lesson.remember ?? "", workedExample: lesson.worked_example,
        reflection: lesson.reflection_prompt ?? "", language: lesson.language ?? "",
        objectives: Array.isArray(lesson.objectives) ? lesson.objectives.map(String) : [],
        minutes: lesson.estimated_minutes, status: lesson.status,
      } : undefined}/>
    </section>

    <section className="mt-8 grid gap-6 lg:grid-cols-2" id="activities">
      <div className="card"><p className="eyebrow">Comparable assessments</p><h2 className="mt-2 text-2xl font-bold">Assessment blueprint</h2><p className="mb-6 mt-2 text-sm text-slate-600">Starting points, progress points and retention checks use named blueprints so questions remain skill-matched and comparable.</p><AssessmentBlueprintForm versions={(curriculumVersions??[]).map(version=>({id:version.id,title:`${related(version.courses)?.title??"Course"} · ${version.version_label}`}))} units={(units??[]).map(unit=>({id:unit.id,title:`${unit.code} · ${unit.title}`}))}/></div>
      <div className="card"><p className="eyebrow">Formative authoring</p><h2 className="mt-2 text-2xl font-bold">Create an activity</h2><p className="mb-6 mt-2 text-sm text-slate-600">Create classwork, homework, practice, mastery, retrieval or progress checks. Add questions below before approval and allocation.</p><ActivityEditorForm lessons={(allLessons??[]).map(item=>({id:item.id,title:item.title}))} blueprints={(blueprints??[]).map(item=>({id:item.id,title:`${item.title} · ${item.scope.replaceAll("_"," ")}`}))}/></div>
    </section>

    <section className="card mt-8" id="questions"><p className="eyebrow">Reusable question bank</p><h2 className="mt-2 text-2xl font-bold">Create a skill-mapped question</h2><p className="mb-6 mt-2 text-sm text-slate-600">Use deterministic, teacher-authored answers. Draft is the safest default for review.</p><QuestionEditorForm activities={activityOptions} skills={skillOptions}/></section>

    <section className="card mt-8"><p className="eyebrow">Detailed review</p><h2 className="mt-2 text-2xl font-bold">Edit draft questions</h2><p className="mt-2 text-sm text-slate-600">Review wording, feedback, marks, blueprint category and misconception mappings before approval. Stored correct answers remain hidden unless deliberately replaced.</p><div className="mt-5 grid gap-4">{draftQuestions?.map(question=><details className="rounded-xl border border-slate-200 p-4" key={question.id}><summary className="cursor-pointer font-semibold">{question.question_text}</summary><QuestionReviewForm question={{id:question.id,question_text:question.question_text,pathway:question.pathway,status:question.status,explanation:question.explanation,feedback_correct:question.feedback_correct,feedback_incorrect:question.feedback_incorrect,hint:question.hint,marks:question.marks,estimated_seconds:question.estimated_seconds,blueprint_id:question.blueprint_id,blueprint_category:question.blueprint_category,tags:question.tags??[],optionText:(question.question_options??[]).map(option=>option.option_text),misconceptionIds:(question.question_misconceptions??[]).map(mapping=>mapping.misconception_id)}} blueprints={(blueprints??[]).map(item=>({id:item.id,title:`${item.title} · ${item.scope.replaceAll("_"," ")}`}))} misconceptions={(misconceptionDefinitions??[]).map(item=>({id:item.id,title:`${related(item.skills)?.title??"Skill"} · ${item.title}`}))}/></details>)}</div></section>

    <section className="card mt-8" id="review"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Approval queue</p><h2 className="mt-2 text-2xl font-bold">Question drafts</h2></div><span className="text-sm text-slate-500">{draftQuestions?.length ?? 0} awaiting review</span></div>
      <div className="mt-5 grid gap-3">{draftQuestions?.length ? draftQuestions.map(question => <article className="rounded-xl border border-slate-200 p-4" key={question.id}><p className="text-xs font-bold uppercase tracking-wide text-teal-700">{question.kind.replaceAll("_"," ")} · {question.pathway} · {related(question.skills)?.title}</p><p className="mt-2 whitespace-pre-wrap font-semibold">{question.question_text}</p><div className="mt-3 flex gap-4"><ContentStatusForm entity="question" entityId={question.id} status="approved"/><ContentStatusForm entity="question" entityId={question.id} status="archived"/></div></article>) : <p className="text-slate-600">No question drafts are waiting for approval.</p>}</div>
    </section>

    <section className="card mt-8" id="allocation"><p className="eyebrow">Weekly learning</p><h2 className="mt-2 text-2xl font-bold">Allocate activity to a class</h2><p className="mb-6 mt-2 text-sm text-slate-600">Set pathway, release date, deadline and whether the practice is required.</p><AllocationForm activities={activityOptions} classes={classOptions}/>
      {allocations?.length ? <div className="mt-8"><h3 className="font-bold">Recent allocations</h3><div className="mt-3 grid gap-2">{allocations.map(item => <div className="rounded-xl bg-slate-50 p-4 text-sm" key={item.id}><strong>{related(item.activities)?.title}</strong> → {related(item.classes)?.name ?? "individual learner"} · {item.allocated_pathway} · due {item.deadline_at ? new Date(item.deadline_at).toLocaleDateString("en-GB") : "no deadline"} · {item.required ? "required" : "optional"}</div>)}</div></div> : null}
    </section>

    <section className="card mt-8" id="calendar"><p className="eyebrow">Academic calendar</p><h2 className="mt-2 text-2xl font-bold">Teaching, review and course dates</h2><p className="mb-6 mt-2 text-sm text-slate-600">Add holidays, teaching weeks, progress points, review weeks and examination reminders. These dates appear on learner dashboards and do not represent formal assignment handling.</p>
      <AcademicCalendarForm years={academicYears??[]} periods={academicPeriods??[]}/>
      <div className="mt-6 grid gap-3">{calendarEvents?.map(event=><details className="rounded-xl border border-slate-200 p-4" key={event.id}><summary className="cursor-pointer font-semibold">{event.title} · {event.kind.replaceAll("_"," ")} · {new Date(event.starts_on).toLocaleDateString("en-GB")}</summary><div className="mt-4"><AcademicCalendarForm years={academicYears??[]} periods={academicPeriods??[]} event={event}/></div></details>)}</div>
    </section>

    <section className="card mt-8" id="settings"><p className="eyebrow">Healthy motivation</p><h2 className="mt-2 text-2xl font-bold">Class gamification settings</h2><p className="mb-6 mt-2 text-sm text-slate-600">Badges, coins and scheduled-day streaks can be disabled without affecting academic progress evidence.</p><GamificationForm classes={classOptions}/></section>

    <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"><strong>Scope boundary:</strong> these tools create formative learning, practice and review only. They do not collect, mark or grade formal assignments.</section>
  </main></>;
}

function related<T>(value: T | T[] | null | undefined): T | undefined { return Array.isArray(value) ? value[0] : value ?? undefined; }
function formatStage(stage: string | null) { return (stage ?? "Practice").replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase()); }

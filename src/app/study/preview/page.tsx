import {notFound} from "next/navigation";
import {MiniStudyPlayer} from "@/components/mini-study-player";
import {publicStudyQuestions,studyQuestionSet,type StudyCard} from "@/lib/mini-study";
import {unit6StudyBaseline,unit6StudyLessons} from "@/lib/mini-study-content";
import {checkPreviewStudy,finishPreviewStudy} from "./actions";

export default async function StudyPreview({searchParams}:{searchParams:Promise<{mode?:string}>}) {
  if(process.env.NODE_ENV!=="development") notFound();
  const {mode}=await searchParams;
  const kind=mode==="baseline"?"baseline":"daily";
  const lesson=unit6StudyLessons[mode==="recap"?1:0];
  const keys=kind==="baseline"?unit6StudyBaseline:mode==="recap"?studyQuestionSet(lesson,unit6StudyLessons[0]):lesson.questions;
  const card:StudyCard={sessionId:kind==="baseline"?"baseline-preview":mode==="recap"?"recap-preview":"daily-preview",kind,title:kind==="baseline"?"Your starting point":lesson.title,
    unitTitle:"Website Development",lines:kind==="baseline"?["Four short questions, one at a time.","It is fine to choose ‘I'm not sure yet’."]:lesson.lines,example:kind==="baseline"?"":lesson.example,support:kind==="baseline"?"":lesson.support,
    questions:publicStudyQuestions(keys,mode??"daily")};
  return <div className="mini-study-surface"><header className="mini-study-header">SCCB Learning · Preview only</header>
    <main className="mini-study-main"><p className="mb-4">Test preview: no learner records or rewards are changed.</p><MiniStudyPlayer card={card} check={checkPreviewStudy} finish={finishPreviewStudy}/></main></div>;
}

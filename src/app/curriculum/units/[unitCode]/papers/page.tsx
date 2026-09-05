import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {PracticePaper} from "@/components/practice-paper";
import {unitByCode} from "@/lib/learning-catalog";
import {requireCurriculumUnitAccess} from "@/lib/curriculum-access";
import {isExternalAssessmentUnit} from "@/lib/unit-assessment-kind";
export default async function PapersPage({params}:{params:Promise<{unitCode:string}>}){const{unitCode}=await params;await requireCurriculumUnitAccess(unitCode);const unit=unitByCode(unitCode);if(!unit)notFound();if(!isExternalAssessmentUnit(unit))redirect(`/curriculum/units/${unit.code}`);return <main className="shell py-10"><Link className="link" href={`/curriculum/units/${unit.code}`}>← Unit {unit.code}</Link><header className="my-8"><p className="eyebrow">External assessment practice</p><h1 className="mt-3 text-4xl font-bold">Unit {unit.code} practice papers</h1><p className="mt-3 text-slate-600">Optional mixed-topic practice for this external assessment unit.</p></header><PracticePaper unit={unit}/></main>}

import Link from "next/link";
import {notFound} from "next/navigation";
import {PracticePaper} from "@/components/practice-paper";
import {unitByCode} from "@/lib/learning-catalog";
import {requireCurriculumUnitAccess} from "@/lib/curriculum-access";
export default async function PapersPage({params}:{params:Promise<{unitCode:string}>}){const{unitCode}=await params;await requireCurriculumUnitAccess(unitCode);const unit=unitByCode(unitCode);if(!unit)notFound();return <main className="shell py-10"><Link className="link" href={`/curriculum/units/${unit.code}`}>← Unit {unit.code}</Link><header className="my-8"><p className="eyebrow">Practice</p><h1 className="mt-3 text-4xl font-bold">Unit {unit.code} practice papers</h1><p className="mt-3 text-slate-600">Fresh mixed-topic papers with instant marking and a worked explanation for every question.</p></header><PracticePaper unit={unit}/></main>}

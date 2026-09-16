const base="https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Information-Technology/2016/";
export const unit14Spec=base+"specification-and-sample-assessments/specification-pearson-btec-level-3-national-extended-diploma-in-information-technology.pdf";
export type ExamPaper={id:string;title:string;links:{title:string;url:string}[];note?:string};
// Public task identifiers only. Downloads and marking resources stay server-side.
export const unit14Papers:ExamPaper[]=[
{id:"sample",title:"Pearson sample assessment",links:[]},
{id:"additional-sample",title:"Pearson additional sample assessment",links:[]},
{id:"2018-june",title:"June 2018",links:[]},
{id:"2019-jan",title:"January 2019",links:[]},
{id:"2019-june",title:"June 2019",links:[]},
{id:"2020-jan",title:"January 2020",links:[]},
{id:"2021-jan",title:"January 2021",links:[]},
{id:"2022-june",title:"June 2022",links:[]},
{id:"2023-june",title:"June 2023",links:[]},
{id:"2024-jan",title:"January 2024",links:[]},
{id:"2024-june",title:"June 2024",links:[]},
];
export const unit14Activities=["Outline service strategy","IT service catalogue","IT service delivery solution","Justification of the solution","Service management implications"];
export function unit14Checkpoint(day:string){
 if(day<"2026-10-01")return "September: learn the foundations and complete short checks. Use the sample task to practise one section at a time.";
 if(day<"2026-11-01")return "October: apply the teaching to two contrasting released scenarios. Review each section before starting another.";
 if(day<"2026-12-01")return "November: work through timed sections from further papers. Keep an error log and rewrite the weakest section after feedback.";
 if(day<"2027-01-01")return "December: complete a full teacher-organised mock, review it, then use a different paper to check improvement. Follow the college holiday plan.";
 return "January: revisit your weakest areas and follow your teacher's confirmed assessment timetable and preparation rules. This portal is for practice, not the live assessment.";
}

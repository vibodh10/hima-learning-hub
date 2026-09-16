const base="https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Information-Technology/2016/";
export const unit14Spec=base+"specification-and-sample-assessments/specification-pearson-btec-level-3-national-extended-diploma-in-information-technology.pdf";
export const unit14Catalogue="https://qualifications.pearson.com/en/qualifications/btec-nationals/information-technology-2016.coursematerials.html#filterQuery=category:Pearson-UK:Category%2FExternal-assessments&filterQuery=category:Pearson-UK:Unit%2FUnit-14";
export type ExamPaper={id:string;title:string;links:{title:string;url:string}[];note?:string};
const link=(title:string,path:string)=>({title,url:base+path});
// Links observed in Pearson's public Unit 14 catalogue, 16 September 2026.
export const unit14Papers:ExamPaper[]=[
{id:"sample",title:"Pearson sample assessment",links:[link("Sample task, templates and marking grid (PDF)","specification-and-sample-assessments/u14-it-service-delivery-task-sam.pdf")]},
{id:"additional-sample",title:"Pearson additional sample assessment",links:[link("Additional sample materials (ZIP)","specification-and-sample-assessments/Additional-Sample-Assessment-Material-Unit-14-IT-Service-Delivery.zip")]},
{id:"2018-june",title:"June 2018",links:[link("Part A (PDF)","external-assessment/20161K_Unit14_que_PartA_20180514.pdf"),link("Part B and files (ZIP)","external-assessment/BTEC-L3-IT-Unit-14-IT-Service-Delivery...-Pt-B-June-2018.zip"),link("Mark scheme","external-assessment/20161K_unit14_rms_allseries.pdf"),link("Examiner report","external-assessment/20161K_unit14_pef_20180815.pdf")]},
{id:"2019-jan",title:"January 2019",links:[link("Part A (ZIP)","external-assessment/btec-l3-it-unit-14-it-service-delivery-pt-a-jan-2019.zip"),link("Part B (ZIP)","external-assessment/btec-l3-it-unit-14-it-service-delivery-pt-b-jan-2019.zip"),link("Mark scheme","external-assessment/20161k-unit14-rms-allseries.pdf"),link("Examiner report","External-assessments/20161K_unit14_pef_20190313.pdf")]},
{id:"2019-june",title:"June 2019",links:[link("Part A (ZIP)","external-assessment/btec-l3-it-unit-14-it-service-delivery-pt-a-june-2019.zip"),link("Part B (ZIP)","external-assessment/btec-l3-it-unit-14-it-service-delivery-pt-b-june-2019.zip"),link("Mark scheme","External-assessments/20161K_unit14_rms_allseries_1906.pdf")]},
{id:"2020-jan",title:"January 2020",links:[link("Part A (ZIP)","external-assessment/btec-l3-it-unit-14-it-service-delivery-pt-a-jan-2020.zip"),link("Part B (ZIP)","external-assessment/btec-l3-it-unit-14-it-service-delivery-pt-b-jan-2020.zip"),link("Mark scheme","external-assessment/20161k-unit14-rms-allseries-2001.pdf"),link("Examiner report","external-assessment/20161k-unit14-pef-20200318.pdf")]},
{id:"2021-jan",title:"January 2021",links:[link("Part A (ZIP)","external-assessment/btec-l3-it-unit-14-it-service-delivery-pt-a-jan-2021.zip"),link("Part B (ZIP)","external-assessment/btec-l3-it-unit-14-it-service-delivery-pt-b-jan-2021.zip"),link("Mark scheme","external-assessment/20161k-unit14-rms-allseries-2101.pdf"),link("Examiner report","External-assessments/20161K_unit14_pef_20210317.pdf")]},
{id:"2022-june",title:"June 2022",links:[link("Released task (PDF)","External-assessments/20161k-unit14-que-20220817.pdf"),link("All-series mark scheme","External-assessments/20161k-unit14-rms-20220817.pdf"),link("Examiner report","External-assessments/20161k-unit14-pef-20220817.pdf")],note:"Check the downloaded contents with your teacher before a full mock; use the matching Part A and templates where required."},
{id:"2023-june",title:"June 2023",links:[link("Parts A and B (PDF)","External-assessments/btec-l3-it-20161k-u14-part-a-and-b.pdf"),link("Examiner report","External-assessments/20161k-unit14-pef-20230816.pdf")]},
{id:"2024-jan",title:"January 2024",links:[link("Parts A and B (ZIP)","External-assessments/btec-l3-it-unit-14-it-service-delivery-part-a-and-b-jan-2024.zip"),link("Examiner report","External-assessments/20161k-unit14-pef-20240320.pdf")]},
{id:"2024-june",title:"June 2024",links:[link("Parts A and B (ZIP)","External-assessments/it-u14-20161k-june-2024-combined.zip"),link("Mark scheme","External-assessments/20161k-unit-14-rms-20240814.pdf"),link("Examiner report","External-assessments/20161k-unit-14-pef-20240814.pdf")]},
];
export const unit14Activities=["Outline service strategy","IT service catalogue","IT service delivery solution","Justification of the solution","Service management implications"];
export function unit14Checkpoint(day:string){
 if(day<"2026-10-01")return "September: learn the foundations and complete short checks. Use the sample task to practise one section at a time.";
 if(day<"2026-11-01")return "October: apply the teaching to two contrasting released scenarios. Review each section before starting another.";
 if(day<"2026-12-01")return "November: work through timed sections from further papers. Keep an error log and rewrite the weakest section after feedback.";
 if(day<"2027-01-01")return "December: complete a full teacher-organised mock, review it, then use a different paper to check improvement. Follow the college holiday plan.";
 return "January: revisit your weakest areas and follow your teacher's confirmed assessment timetable and preparation rules. This portal is for practice, not the live assessment.";
}

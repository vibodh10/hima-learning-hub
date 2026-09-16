from pathlib import Path
import re
p=Path('src/lib/unit14-exam.ts');s=p.read_text();start=s.index('const link=');end=s.index('export const unit14Activities');resource=s[start:end];Path('src/lib/unit14-teacher-resources.ts').write_text('import "server-only";\nimport type {ExamPaper} from "./unit14-exam";\nconst base="https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Information-Technology/2016/";\n'+resource.replace('unit14Papers','unit14TeacherPapers'))
metadata=re.findall(r'\{id:"([^"]+)",title:"([^"]+)"',resource)
s=s[:start]+'// Public task identifiers only. Downloads and marking resources stay server-side.\nexport const unit14Papers:ExamPaper[]=[\n'+''.join('{id:"'+i+'",title:"'+t+'",links:[]},\n' for i,t in metadata)+'];\n'+s[end:];p.write_text(s)
p=Path('src/components/unit14-exam-practice.tsx');s=p.read_text().replace('unit14Activities,unit14Papers,unit14Catalogue','unit14Activities,unit14Papers');a=s.index('<><h3 className="text-xl font-bold">Review against Pearson');b=s.index('</>}',a)+4;s=s[:a]+'<><h3 className="text-xl font-bold">Review your response</h3><p>Check that your answer addresses the task and explains your reasons. Hima or Lee will use the marking guidance to review your work. Mark schemes are available in the teacher resource section only.</p></>}'+s[b:];s=s.replace('Open {chosen?.title}, read its scenario','Use the question-only copy of {chosen?.title} supplied by your teacher. Read its scenario');p.write_text(s)
p=Path('src/app/study/unit14-exam/page.tsx');s=p.read_text();s='import {unit14TeacherPapers} from "@/lib/unit14-teacher-resources";\n'+s;s=s.replace('const groups=[]','const papers=staff?unit14TeacherPapers:unit14Papers;\n const groups=[]');s=s.replace('{unit14Papers.map(p=>','{papers.map(p=>');s=s.replace('<ul className="mt-2 space-y-2">','{!staff&&<p>Ask Hima or Lee for the question-only paper and templates. Download bundles and marking guidance are held in the teacher view.</p>}<ul className="mt-2 space-y-2">');needle='<p><a className="link" href={unit14Catalogue}';s=s.replace(needle,'{staff&&'+needle);s=s.replace('Pearson&apos;s full Unit 14 catalogue</a></p>','Pearson&apos;s full Unit 14 catalogue (teacher resources)</a></p>}');s=s.replace('Find the matching Pearson marking grid and examiner report</a></p>','Find the matching Pearson marking grid and examiner report</a></p>}');s=s.replace(':<p><a className="link" href={unit14Catalogue}',':<p><a className="link" href={unit14Catalogue}')
# The saved review branch uses a role-gated fragment, with student-specific guidance.
s=s.replace(':</>',':</>')
s=s.replace(':</p>',':</p>')
s=s.replace('>: {staff','>: {staff')
s=s.replace('</>: {staff','</>: {staff')
s=s.replace('</>:{staff&&<p>', '</>:staff?<p>')
s=s.replace('Find the matching Pearson marking grid and examiner report</a></p>}}','Find the matching Pearson marking grid and examiner report</a></p>:<p>Ask your teacher for feedback on this response.</p>}')
p.write_text(s)

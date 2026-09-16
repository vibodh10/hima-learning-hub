from pathlib import Path
p=Path('src/lib/unit14-exam.ts');s=p.read_text();line=next(l for l in s.splitlines(True) if l.startswith('export const unit14Catalogue='));p.write_text(s.replace(line,''));p=Path('src/lib/unit14-teacher-resources.ts');s=p.read_text();p.write_text(s+line)
p=Path('src/app/study/unit14-exam/page.tsx');s=p.read_text().replace('import {unit14TeacherPapers}','import {unit14TeacherPapers,unit14Catalogue}').replace('unit14Papers,unit14Spec,unit14Catalogue','unit14Papers,unit14Spec');p.write_text(s)

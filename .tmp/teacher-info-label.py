from pathlib import Path
paths=['src/app/dashboard/page.tsx','src/app/teacher/classes/[id]/history/page.tsx','src/components/teacher-priority-list.tsx','src/lib/teacher-next-action.ts']
for file in paths:
 p=Path(file);s=p.read_text();s=s.replace('"Action Required"','"For your information"').replace('"Action required"','"For your information"');s=s.replace('"bg-orange-100 text-orange-950"','"bg-sky-50 text-sky-900"')
 if file.endswith('dashboard/page.tsx'):
  s=s.replace('Who needs me?','Learner updates').replace('Based on recorded catch-up, intervention, outstanding\n                        work and current learning evidence.','Earlier recorded targets, catch-up and learning evidence. Informational notices do not assign you a task. Check the current short-study record before deciding whether support is needed.')
 if file.endswith('teacher-priority-list.tsx'):
  s=s.replace('Students who need help','Learner updates').replace('Only recorded learning, catch-up and intervention evidence is used.','Informational notices do not assign you a task. Check the current learning record before deciding whether support is needed.')
 if file.endswith('teacher-next-action.ts'):
  s=s.replace('eyebrow: "Next teaching action",','eyebrow: attention.status==="action_required"?"For your information":"Next teaching action",').replace('title: `Review ${attention.displayName}`,','title: attention.status==="action_required"?`Learning update: ${attention.displayName}`:`Review ${attention.displayName}`,')
 p.write_text(s,encoding='utf-8')
p=Path('src/components/teacher-priority-list.test.tsx');s=p.read_text().replace('Action required/i','For your information/i');p.write_text(s)

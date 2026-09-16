from pathlib import Path
p=Path('src/lib/starting-point.ts');s=p.read_text();a=s.index('export function startingPointRoute');route=s[a:];s=s[:a];p.write_text(s)
p=Path('src/lib/starting-point-route.ts');p.write_text('import type {StudyGrade} from "./mini-study";\n'+route)
for path in ['src/components/timed-starting-point.tsx','src/components/mini-study-report.tsx']:
 p=Path(path);s=p.read_text().replace('from "@/lib/starting-point"','from "@/lib/starting-point-route"');p.write_text(s)
p=Path('src/components/mini-study-report.tsx');s=p.read_text().replace('Starting route: {startingPointRoute(row.summary.baseline)}. Provisional guidance for teaching, not a grade.','Starting route: {startingPointRoute(row.summary.baseline)}. Provisional guidance for teaching, not a grade. {row.summary.latest&&`Latest practice: ${row.summary.latest.grade.correct/row.summary.latest.grade.total<0.5?"support with this skill":row.summary.latest.grade.correct/row.summary.latest.grade.total<0.8?"core practice":"ready to try stretch on this skill"}.`}');p.write_text(s)

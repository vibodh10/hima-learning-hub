from pathlib import Path
s=Path('supabase/migrations/202609080001_mini_study.sql').read_text();s=s[s.index('create function public.check_mini_study'):s.index('create function public.finish_mini_study')];s=s.replace('create function public.check_mini_study','create or replace function public.check_mini_study').replace("not between 1 and 4","not between 1 and 10");Path('supabase/migrations/202609160004_save_ten_answer_starting_point.sql').write_text('-- Accept ten-answer starting points; retain first-answer and ownership guards.\n'+s)
p=Path('supabase/tests/starting_point_first.sql');s=p.read_text();needle="update public.mini_study_sessions set status='completed'";addition="""select public.check_mini_study('90000000-0000-0000-0000-000000000002',(select new_id from sp_fixture),'{\"correct\":8,\"total\":10,\"feedback\":[]}','Review missed skills');
do $$ declare saved jsonb; begin
 saved:=public.check_mini_study('90000000-0000-0000-0000-000000000002',(select new_id from sp_fixture),'{\"correct\":10,\"total\":10,\"feedback\":[]}','Overwrite');
 if saved->>'correct'<>'8' then raise exception 'Retry replaced first answers'; end if;
end $$;
""";s=s.replace(needle,addition+needle);p.write_text(s)

-- Course starting points remain available to enrolled learners independently
-- of the teacher's current unit selections.
create or replace function public.can_access_unit(unit_uuid uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select
  (select role from public.current_profile()) in ('teacher','administrator')
  or exists(
    select 1 from public.enrolments e
    join public.classes c on c.id=e.class_id
    join public.class_units cu on cu.class_id=c.id
    where e.student_id=auth.uid() and e.archived_at is null
      and c.archived_at is null and c.published
      and cu.unit_id=unit_uuid and cu.active and cu.archived_at is null
  )
  or exists(
    select 1 from public.enrolments e
    join public.classes c on c.id=e.class_id
    join public.units u on u.course_id=c.course_id
    where e.student_id=auth.uid() and e.archived_at is null
      and c.archived_at is null and c.published
      and u.id=unit_uuid and u.code='1'
  )
$$;

revoke all on function public.can_access_unit(uuid) from public;
grant execute on function public.can_access_unit(uuid) to authenticated;

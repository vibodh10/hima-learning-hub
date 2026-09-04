-- Temporary, revocable class registration links are now the only reusable
-- student self-service route. The legacy class code cannot remain executable,
-- otherwise closing a registration link would not close class access.

revoke all on function public.join_class(text) from public,anon,authenticated;

comment on function public.join_class(text) is
  'Legacy class-code join retained for migration history only. Execution is revoked; students join through a teacher-controlled registration link or a one-person accepted invitation.';

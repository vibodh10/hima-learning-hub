-- Durable, retryable student invitations. Raw invitation tokens are never
-- stored. Auth remains authoritative for token generation and expiry.

create table if not exists public.student_invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  class_id uuid not null references public.classes(id),
  email_normalized text not null,
  display_name text not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  invited_by uuid not null references public.user_profiles(id),
  invited_at timestamptz not null default now(),
  last_sent_at timestamptz,
  accepted_at timestamptz,
  send_count integer not null default 0,
  last_detail_code text,
  metadata jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique(class_id,email_normalized),
  check(email_normalized=lower(trim(email_normalized))),
  check(length(email_normalized) between 3 and 320),
  check(length(trim(display_name)) between 2 and 80),
  check(status in ('pending','sent','accepted','failed','cancelled','expired')),
  check(send_count>=0)
);

create table if not exists public.student_invitation_events (
  id bigint generated always as identity primary key,
  invitation_id uuid not null references public.student_invitations(id) on delete cascade,
  actor_id uuid references public.user_profiles(id),
  status text not null,
  detail_code text not null,
  occurred_at timestamptz not null default now(),
  check(status in ('pending','sent','accepted','failed','cancelled','expired'))
);

create index if not exists student_invitations_class_status_idx
  on public.student_invitations(class_id,status,updated_at desc);
create index if not exists student_invitations_user_idx
  on public.student_invitations(auth_user_id) where auth_user_id is not null;
create index if not exists student_invitation_events_invitation_idx
  on public.student_invitation_events(invitation_id,occurred_at desc);

alter table public.student_invitations enable row level security;
alter table public.student_invitation_events enable row level security;

grant select on public.student_invitations to authenticated;
grant select on public.student_invitation_events to authenticated;

create policy student_invitations_staff_read on public.student_invitations
for select to authenticated using (
  public.can_manage_class(class_id)
);

create policy student_invitation_events_staff_read on public.student_invitation_events
for select to authenticated using (
  exists (
    select 1 from public.student_invitations invitation
    where invitation.id=invitation_id
      and public.can_manage_class(invitation.class_id)
  )
);

create or replace function public.resolve_invitable_auth_user(target_email text)
returns table(
  account_exists boolean,
  user_id uuid,
  permitted boolean,
  block_code text
)
language plpgsql stable security definer set search_path=''
as $$
declare
  actor public.user_profiles;
  auth_user auth.users;
  profile public.user_profiles;
begin
  actor:=public.current_profile();
  if actor.id is null or actor.role not in ('teacher','administrator') then
    raise exception 'not_authorised' using errcode='42501';
  end if;

  select * into auth_user from auth.users
  where lower(email)=lower(trim(target_email))
  order by created_at limit 1;

  if auth_user.id is null then
    return query select false,null::uuid,true,null::text;
    return;
  end if;

  select * into profile from public.user_profiles where id=auth_user.id;
  if profile.id is null then
    return query select true,auth_user.id,true,null::text;
  elsif profile.organisation_id<>actor.organisation_id then
    return query select true,null::uuid,false,'different_organisation'::text;
  elsif profile.role<>'student' then
    return query select true,null::uuid,false,'staff_account'::text;
  elsif profile.archived_at is not null then
    return query select true,null::uuid,false,'archived_account'::text;
  end if;

  return query select true,auth_user.id,true,null::text;
end;
$$;

revoke all on function public.resolve_invitable_auth_user(text) from public,anon;
grant execute on function public.resolve_invitable_auth_user(text) to authenticated;

comment on table public.student_invitations is
  'Staff-visible invitation lifecycle. Supabase Auth remains authoritative for tokens and expiry; raw tokens are never stored here.';
comment on function public.resolve_invitable_auth_user(text) is
  'Resolves only an exact teacher-supplied email and returns the minimum account-linking decision needed by the invitation action.';

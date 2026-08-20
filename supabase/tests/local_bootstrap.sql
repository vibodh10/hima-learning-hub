-- Minimal Supabase Auth compatibility layer for an isolated local PostgreSQL
-- syntax/integration test. Production uses Supabase's real auth schema.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users (
  instance_id uuid, id uuid primary key, aud text, role text, email text unique,
  encrypted_password text, email_confirmed_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz
);
create table auth.identities (
  id uuid primary key default gen_random_uuid(), provider_id uuid,
  user_id uuid not null references auth.users(id), identity_data jsonb,
  provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz
);
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

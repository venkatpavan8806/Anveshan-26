-- ============================================================================
-- ANVESHAN — Database schema + Row Level Security
-- Run this whole file once in Supabase Dashboard → SQL Editor → New query.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

do $$ begin
  create type public.role_t as enum ('ADMIN', 'VOLUNTEER', 'PARTICIPANT');
exception when duplicate_object then null; end $$;

-- PENDING: registered but hasn't arrived yet (the default for anyone
-- imported/registered in advance). IN/OUT only apply once a volunteer has
-- actually scanned them at the gate at least once.
do $$ begin
  create type public.participant_status_t as enum ('PENDING', 'IN', 'OUT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.movement_action_t as enum ('CHECK_IN', 'CHECK_OUT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.slot_status_t as enum ('UPCOMING', 'READY_CALL', 'IN_PROGRESS', 'DONE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_target_t as enum ('ALL', 'TEAM', 'PARTICIPANT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type_t as enum ('INFO', 'READY_CALL', 'PRESENTATION_TIME');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- profiles: 1:1 with auth.users. Created automatically by the
-- handle_new_user() trigger below when someone signs up.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.role_t not null default 'PARTICIPANT',
  name text not null default '',
  team_id uuid, -- set for PARTICIPANT profiles; fk added after teams exists
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project_title text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_team_id_fkey,
  add constraint profiles_team_id_fkey foreign key (team_id)
    references public.teams (id) on delete set null;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  unique_code text not null unique, -- e.g. ANV-0001
  name text not null,
  contact text,
  team_id uuid references public.teams (id) on delete set null,
  qr_data text not null, -- payload encoded in the printed QR (== unique_code)
  status public.participant_status_t not null default 'PENDING',
  photo_url text,
  -- links this participant record to their own login (nullable: a
  -- participant can exist before they've ever logged in).
  profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.movement_logs (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  action public.movement_action_t not null,
  timestamp timestamptz not null default now(),
  scanned_by uuid references public.profiles (id) on delete set null,
  gate_label text
);

create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  status public.slot_status_t not null default 'UPCOMING',
  created_at timestamptz not null default now()
);

create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  section_title text not null,
  content text not null, -- markdown
  order_index int not null default 0
);

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  order_index int not null default 0
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target public.notification_target_t not null default 'ALL',
  target_id uuid, -- team_id or participant_id depending on target
  sent_at timestamptz not null default now(),
  type public.notification_type_t not null default 'INFO'
);

-- per-participant read/unread state for the in-app bell.
create table if not exists public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (notification_id, participant_id)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  subscription_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (participant_id, subscription_json)
);

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  game text not null check (game in ('trivia', 'memory', 'reaction', 'game2048', 'flappy')),
  score int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options text[] not null,
  correct_index int not null,
  order_index int not null default 0
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

create index if not exists idx_participants_team on public.participants (team_id);
create index if not exists idx_participants_status on public.participants (status);
create index if not exists idx_participants_profile on public.participants (profile_id);
create index if not exists idx_movement_logs_participant on public.movement_logs (participant_id, timestamp desc);
create index if not exists idx_movement_logs_timestamp on public.movement_logs (timestamp desc);
create index if not exists idx_schedule_slots_start on public.schedule_slots (start_time);
create index if not exists idx_schedule_slots_team on public.schedule_slots (team_id);
create index if not exists idx_notifications_sent on public.notifications (sent_at desc);
create index if not exists idx_game_scores_game on public.game_scores (game, score desc);
create index if not exists idx_profiles_team on public.profiles (team_id);

-- ============================================================================
-- 4. AUTH TRIGGER — auto-create a profile row on signup.
--
-- Admin-created accounts (volunteers, other admins) should be created via
-- the admin API (service role) passing user_metadata: { role, name }.
-- Self-service participant signups default to role PARTICIPANT.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.role_t, 'PARTICIPANT'),
    coalesce(new.raw_user_meta_data ->> 'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 5. HELPER FUNCTIONS (SECURITY DEFINER — bypass RLS internally so policies
-- that call them don't recurse into themselves).
-- ============================================================================

create or replace function public.current_role()
returns public.role_t
language sql security definer set search_path = public stable
as $$ select role from public.profiles where id = auth.uid(); $$;

create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public stable
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN'); $$;

create or replace function public.is_staff()
returns boolean
language sql security definer set search_path = public stable
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('ADMIN','VOLUNTEER')); $$;

create or replace function public.my_participant_id()
returns uuid
language sql security definer set search_path = public stable
as $$ select id from public.participants where profile_id = auth.uid(); $$;

create or replace function public.my_team_id()
returns uuid
language sql security definer set search_path = public stable
as $$ select team_id from public.profiles where id = auth.uid(); $$;

-- ============================================================================
-- 6. SCANNER RPC — atomically flips status + writes the log row, tagged
-- with the caller's identity. Volunteers call this instead of writing to
-- `participants`/`movement_logs` directly, so we never need to grant them
-- raw UPDATE on participants.
-- ============================================================================

create or replace function public.toggle_participant_status(
  p_participant_id uuid,
  p_gate_label text default null
)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.participants;
  v_new_status public.participant_status_t;
  v_action public.movement_action_t;
begin
  if not public.is_staff() then
    raise exception 'only staff can scan participants';
  end if;

  select * into v_participant from public.participants where id = p_participant_id for update;
  if not found then
    raise exception 'participant not found';
  end if;

  if v_participant.status = 'IN' then
    v_new_status := 'OUT';
    v_action := 'CHECK_OUT';
  else
    v_new_status := 'IN';
    v_action := 'CHECK_IN';
  end if;

  update public.participants set status = v_new_status where id = p_participant_id
    returning * into v_participant;

  insert into public.movement_logs (participant_id, action, scanned_by, gate_label)
  values (p_participant_id, v_action, auth.uid(), p_gate_label);

  return v_participant;
end;
$$;

grant execute on function public.toggle_participant_status(uuid, text) to authenticated;

-- ============================================================================
-- 5a. SELF-SERVICE PROFILE EDIT — lets a participant update their own
-- name/contact/photo without a direct UPDATE grant on `participants`
-- (which would also expose status/team_id/unique_code to tampering).
-- Pass null for any field you don't want to change.
-- ============================================================================

create or replace function public.update_my_profile(
  p_name text default null,
  p_contact text default null,
  p_photo_url text default null
)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.participants;
begin
  update public.participants
  set
    name = coalesce(nullif(p_name, ''), name),
    contact = coalesce(p_contact, contact),
    photo_url = coalesce(p_photo_url, photo_url)
  where profile_id = auth.uid()
  returning * into v_participant;

  if not found then
    raise exception 'no participant record linked to this account';
  end if;

  update public.profiles set name = coalesce(nullif(p_name, ''), name) where id = auth.uid();

  return v_participant;
end;
$$;

grant execute on function public.update_my_profile(text, text, text) to authenticated;

-- ============================================================================
-- 6a. PARTICIPANT CODE GENERATOR — guarantees unique ANV-0001-style codes
-- even when many rows are inserted concurrently during a CSV bulk import.
-- ============================================================================

create sequence if not exists public.participant_code_seq start 1;

create or replace function public.next_participant_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can generate participant codes';
  end if;
  return 'ANV-' || lpad(nextval('public.participant_code_seq')::text, 4, '0');
end;
$$;

grant execute on function public.next_participant_code() to authenticated;

-- Same generator, but for the local scripts/ingest.mjs tool, which runs
-- with the service-role key and has no auth.uid() to check against.
-- Restricted to service_role only — the browser/anon/authenticated roles
-- can't call this one, so admin-only enforcement still holds for the app.
create or replace function public.next_participant_code_service()
returns text
language sql
security definer
set search_path = public
as $$ select 'ANV-' || lpad(nextval('public.participant_code_seq')::text, 4, '0'); $$;

revoke all on function public.next_participant_code_service() from public, authenticated, anon;
grant execute on function public.next_participant_code_service() to service_role;

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.participants enable row level security;
alter table public.movement_logs enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.rules enable row level security;
alter table public.timeline_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.game_scores enable row level security;
alter table public.quiz_questions enable row level security;

-- ---- profiles ----
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (public.is_admin() or id = auth.uid());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles for update
  using (public.is_admin());

-- ---- teams ----
drop policy if exists "teams_select_authenticated" on public.teams;
create policy "teams_select_authenticated" on public.teams for select
  using (auth.uid() is not null);

drop policy if exists "teams_write_admin" on public.teams;
create policy "teams_write_admin" on public.teams for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- participants ----
-- Staff (admin/volunteer) see everyone, for lookups at the gate. A
-- participant may see only their own row (for their QR/badge/status card).
-- No policy = no access, so participants get zero visibility into anyone
-- else's row — there is deliberately no "select all" path for them.
drop policy if exists "participants_select" on public.participants;
create policy "participants_select" on public.participants for select
  using (public.is_staff() or profile_id = auth.uid());

drop policy if exists "participants_write_admin" on public.participants;
create policy "participants_write_admin" on public.participants for all
  using (public.is_admin()) with check (public.is_admin());
-- Volunteers do NOT get a direct UPDATE policy — status changes go through
-- toggle_participant_status() (section 6), which is SECURITY DEFINER.

-- ---- movement_logs ----
-- Staff only. No policy at all for participants — this table is
-- completely invisible to them, per spec ("movement tracking is invisible
-- to participants entirely").
drop policy if exists "movement_logs_staff_select" on public.movement_logs;
create policy "movement_logs_staff_select" on public.movement_logs for select
  using (public.is_staff());

drop policy if exists "movement_logs_staff_insert" on public.movement_logs;
create policy "movement_logs_staff_insert" on public.movement_logs for insert
  with check (public.is_staff());

-- ---- schedule_slots ----
-- Everyone logged in can read the full schedule (it's the public program);
-- only admins create/edit slots.
drop policy if exists "schedule_slots_select_authenticated" on public.schedule_slots;
create policy "schedule_slots_select_authenticated" on public.schedule_slots for select
  using (auth.uid() is not null);

drop policy if exists "schedule_slots_write_admin" on public.schedule_slots;
create policy "schedule_slots_write_admin" on public.schedule_slots for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- rules ----
drop policy if exists "rules_select_authenticated" on public.rules;
create policy "rules_select_authenticated" on public.rules for select
  using (auth.uid() is not null);

drop policy if exists "rules_write_admin" on public.rules;
create policy "rules_write_admin" on public.rules for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- timeline_events ----
drop policy if exists "timeline_select_authenticated" on public.timeline_events;
create policy "timeline_select_authenticated" on public.timeline_events for select
  using (auth.uid() is not null);

drop policy if exists "timeline_write_admin" on public.timeline_events;
create policy "timeline_write_admin" on public.timeline_events for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- notifications ----
-- A participant sees a notification if it was sent to ALL, to their team,
-- or to them personally. Admins see everything (they composed it).
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications for select
  using (
    public.is_admin()
    or target = 'ALL'
    or (target = 'TEAM' and target_id = public.my_team_id())
    or (target = 'PARTICIPANT' and target_id = public.my_participant_id())
  );

drop policy if exists "notifications_write_admin" on public.notifications;
create policy "notifications_write_admin" on public.notifications for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- notification_reads ----
drop policy if exists "notification_reads_own" on public.notification_reads;
create policy "notification_reads_own" on public.notification_reads for select
  using (public.is_admin() or participant_id = public.my_participant_id());

drop policy if exists "notification_reads_insert_own" on public.notification_reads;
create policy "notification_reads_insert_own" on public.notification_reads for insert
  with check (public.is_admin() or participant_id = public.my_participant_id());

-- ---- push_subscriptions ----
drop policy if exists "push_subs_own" on public.push_subscriptions;
create policy "push_subs_own" on public.push_subscriptions for select
  using (public.is_admin() or participant_id = public.my_participant_id());

drop policy if exists "push_subs_insert_own" on public.push_subscriptions;
create policy "push_subs_insert_own" on public.push_subscriptions for insert
  with check (public.is_admin() or participant_id = public.my_participant_id());

drop policy if exists "push_subs_delete_own" on public.push_subscriptions;
create policy "push_subs_delete_own" on public.push_subscriptions for delete
  using (public.is_admin() or participant_id = public.my_participant_id());

-- ---- game_scores ----
-- Readable by everyone logged in (it's a leaderboard); participants can
-- only insert scores under their own participant_id.
drop policy if exists "game_scores_select_authenticated" on public.game_scores;
create policy "game_scores_select_authenticated" on public.game_scores for select
  using (auth.uid() is not null);

drop policy if exists "game_scores_insert_own" on public.game_scores;
create policy "game_scores_insert_own" on public.game_scores for insert
  with check (public.is_admin() or participant_id = public.my_participant_id());

-- ---- quiz_questions ----
drop policy if exists "quiz_questions_select_authenticated" on public.quiz_questions;
create policy "quiz_questions_select_authenticated" on public.quiz_questions for select
  using (auth.uid() is not null);

drop policy if exists "quiz_questions_write_admin" on public.quiz_questions;
create policy "quiz_questions_write_admin" on public.quiz_questions for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 7a. VIEWS
-- security_invoker = true means this view enforces RLS as the *calling*
-- user (not the view owner) — so it still shows nothing to participants.
-- ============================================================================

create or replace view public.v_currently_out
with (security_invoker = true) as
select distinct on (p.id)
  p.id as participant_id,
  p.name,
  p.unique_code,
  p.photo_url,
  p.team_id,
  ml.timestamp as checked_out_at,
  ml.gate_label
from public.participants p
join public.movement_logs ml on ml.participant_id = p.id and ml.action = 'CHECK_OUT'
where p.status = 'OUT'
order by p.id, ml.timestamp desc;

-- ============================================================================
-- 8. REALTIME — let the admin dashboard subscribe to live changes.
-- ============================================================================

do $$ begin
  alter publication supabase_realtime add table public.participants;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.movement_logs;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 9. STORAGE — bucket for participant photos + badges/logos.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('anveshan', 'anveshan', true)
on conflict (id) do nothing;

drop policy if exists "anveshan_public_read" on storage.objects;
create policy "anveshan_public_read" on storage.objects for select
  using (bucket_id = 'anveshan');

drop policy if exists "anveshan_staff_write" on storage.objects;
create policy "anveshan_staff_write" on storage.objects for insert
  with check (bucket_id = 'anveshan' and public.is_staff());

drop policy if exists "anveshan_staff_update" on storage.objects;
create policy "anveshan_staff_update" on storage.objects for update
  using (bucket_id = 'anveshan' and public.is_staff());

drop policy if exists "anveshan_staff_delete" on storage.objects;
create policy "anveshan_staff_delete" on storage.objects for delete
  using (bucket_id = 'anveshan' and public.is_staff());

-- Participants may upload/replace their own photo, scoped to the
-- "photos/" prefix only — every other path in the bucket (badges,
-- branding) stays staff-only via the policies above.
drop policy if exists "anveshan_participant_photo_insert" on storage.objects;
create policy "anveshan_participant_photo_insert" on storage.objects for insert
  with check (bucket_id = 'anveshan' and name like 'photos/%' and auth.uid() is not null);

drop policy if exists "anveshan_participant_photo_update" on storage.objects;
create policy "anveshan_participant_photo_update" on storage.objects for update
  using (bucket_id = 'anveshan' and name like 'photos/%' and auth.uid() is not null);

-- ============================================================================
-- Done. Next: create your first admin account (see README "First admin").
-- ============================================================================

-- Adds: a participant profile self-edit RPC, and a storage policy so
-- participants can upload their own photo. Safe to run as a single query
-- (no enum values involved, unlike migration 001).

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

drop policy if exists "anveshan_participant_photo_insert" on storage.objects;
create policy "anveshan_participant_photo_insert" on storage.objects for insert
  with check (bucket_id = 'anveshan' and name like 'photos/%' and auth.uid() is not null);

drop policy if exists "anveshan_participant_photo_update" on storage.objects;
create policy "anveshan_participant_photo_update" on storage.objects for update
  using (bucket_id = 'anveshan' and name like 'photos/%' and auth.uid() is not null);

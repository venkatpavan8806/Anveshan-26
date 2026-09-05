-- Adds a `reason` field to movement_logs (e.g. "Food", "Restroom",
-- "Emergency") so IN/OUT entries record *why*, not just when/where.
-- Single query, safe to run as-is.

alter table public.movement_logs add column if not exists reason text;

-- Postgres treats a different parameter list as a distinct overload, so
-- the old 2-arg version must be dropped explicitly — "create or replace"
-- alone would just add a second, ambiguous overload.
drop function if exists public.toggle_participant_status(uuid, text);

create or replace function public.toggle_participant_status(
  p_participant_id uuid,
  p_gate_label text default null,
  p_reason text default null
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

  insert into public.movement_logs (participant_id, action, scanned_by, gate_label, reason)
  values (p_participant_id, v_action, auth.uid(), p_gate_label, p_reason);

  return v_participant;
end;
$$;

grant execute on function public.toggle_participant_status(uuid, text, text) to authenticated;

create or replace view public.v_currently_out
with (security_invoker = true) as
select distinct on (p.id)
  p.id as participant_id,
  p.name,
  p.unique_code,
  p.photo_url,
  p.team_id,
  ml.timestamp as checked_out_at,
  ml.gate_label,
  ml.reason
from public.participants p
join public.movement_logs ml on ml.participant_id = p.id and ml.action = 'CHECK_OUT'
where p.status = 'OUT'
order by p.id, ml.timestamp desc;

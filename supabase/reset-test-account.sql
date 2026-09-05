-- Resets the Kowalski test participant (ANV-0138) back to a clean
-- PENDING state and wipes their movement history — safe to run as many
-- times as you want while testing. Does not touch any other participant.

delete from public.movement_logs
where participant_id = (select id from public.participants where unique_code = 'ANV-0138');

update public.participants
set status = 'PENDING'
where unique_code = 'ANV-0138';

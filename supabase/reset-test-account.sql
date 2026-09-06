-- Resets the Kowalski test participant back to a clean PENDING state and
-- wipes their movement history — safe to run as many times as you want
-- while testing. Matches by email (stable) rather than unique_code
-- (which changes if the account is ever deleted and recreated). Does not
-- touch any other participant.

delete from public.movement_logs
where participant_id = (
  select p.id
  from public.participants p
  join auth.users u on u.id = p.profile_id
  where u.email = 'kowalski8806@gmail.com'
);

update public.participants
set status = 'PENDING'
where profile_id = (select id from auth.users where email = 'kowalski8806@gmail.com');

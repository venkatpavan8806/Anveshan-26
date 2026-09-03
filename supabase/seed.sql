-- Optional sample data for local testing, before you have real event files.
-- Run after schema.sql. Safe to re-run (uses on-conflict-free idempotent
-- inserts guarded by not-exists checks).

insert into public.teams (name, project_title)
select 'Team Falcon', 'AI Study Buddy'
where not exists (select 1 from public.teams where name = 'Team Falcon');

insert into public.teams (name, project_title)
select 'Team Nova', 'Campus Lost & Found'
where not exists (select 1 from public.teams where name = 'Team Nova');

insert into public.rules (section_title, content, order_index)
select 'Code of Conduct', 'Be respectful. Harassment of any kind will result in disqualification.', 1
where not exists (select 1 from public.rules where section_title = 'Code of Conduct');

insert into public.rules (section_title, content, order_index)
select 'Submission Guidelines', 'Push your final code by **6:00 PM**. Late submissions are not judged.', 2
where not exists (select 1 from public.rules where section_title = 'Submission Guidelines');

insert into public.timeline_events (title, description, start_time, end_time, order_index)
select 'Registration & Check-in', 'Collect your badge at the front desk.', now() - interval '1 hour', now(), 1
where not exists (select 1 from public.timeline_events where title = 'Registration & Check-in');

insert into public.timeline_events (title, description, start_time, end_time, order_index)
select 'Opening Ceremony', 'Kickoff talk and rules briefing.', now(), now() + interval '30 minutes', 2
where not exists (select 1 from public.timeline_events where title = 'Opening Ceremony');

insert into public.timeline_events (title, description, start_time, end_time, order_index)
select 'Hacking Begins', null, now() + interval '30 minutes', now() + interval '20 hours', 3
where not exists (select 1 from public.timeline_events where title = 'Hacking Begins');

insert into public.quiz_questions (question, options, correct_index, order_index)
select 'What does HTTP stand for?',
  array['HyperText Transfer Protocol', 'High Transfer Text Protocol', 'HyperText Transmission Path', 'Host Transfer Text Protocol'],
  0, 1
where not exists (select 1 from public.quiz_questions where question = 'What does HTTP stand for?');

insert into public.quiz_questions (question, options, correct_index, order_index)
select 'Which data structure uses FIFO order?',
  array['Stack', 'Queue', 'Tree', 'Heap'],
  1, 2
where not exists (select 1 from public.quiz_questions where question = 'Which data structure uses FIFO order?');

insert into public.quiz_questions (question, options, correct_index, order_index)
select 'What year was Git created?',
  array['2003', '2005', '2008', '2011'],
  1, 3
where not exists (select 1 from public.quiz_questions where question = 'What year was Git created?');

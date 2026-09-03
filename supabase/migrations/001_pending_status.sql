-- Adds a PENDING status: "registered but hasn't arrived yet". Only
-- IN/OUT should reflect actual gate scans.
--
-- IMPORTANT: run this as TWO separate queries (two separate "Run" clicks)
-- in the Supabase SQL Editor. Postgres won't let a new enum value be used
-- in the same transaction it was added in, so Part 1 must fully commit
-- before Part 2 runs.

-- ============================================================================
-- PART 1 — run this alone, then click Run.
-- ============================================================================
alter type public.participant_status_t add value if not exists 'PENDING' before 'IN';


-- ============================================================================
-- PART 2 — run this in a new query, after Part 1 has completed.
-- ============================================================================
alter table public.participants alter column status set default 'PENDING';

-- Anyone currently marked IN who has never actually been scanned (no
-- movement_logs row) was only ever defaulted to IN, not really checked
-- in — reset those back to PENDING. Anyone genuinely scanned in is left
-- alone.
update public.participants
set status = 'PENDING'
where status = 'IN'
  and id not in (select participant_id from public.movement_logs);

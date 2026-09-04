-- Allows 'flappy' as a valid game_scores.game value. Single query, safe
-- to run as-is.

alter table public.game_scores drop constraint if exists game_scores_game_check;
alter table public.game_scores add constraint game_scores_game_check
  check (game in ('trivia', 'memory', 'reaction', 'game2048', 'flappy'));

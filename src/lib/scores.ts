"use client";

import { createClient } from "@/lib/supabase/client";

export async function submitScore(game: "trivia" | "memory" | "reaction" | "game2048" | "flappy", score: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: participant } = await supabase.from("participants").select("id").eq("profile_id", user.id).maybeSingle();
  if (!participant) return;

  await supabase.from("game_scores").insert({ participant_id: participant.id, game, score });
}

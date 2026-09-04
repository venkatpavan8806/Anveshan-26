"use client";

import { createClient } from "@/lib/supabase/client";

export async function submitScore(game: "trivia" | "memory" | "reaction" | "game2048" | "flappy", score: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.warn("submitScore: no logged-in user, score not saved");
    return;
  }

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (participantError) {
    console.error("submitScore: could not look up participant", participantError.message);
    return;
  }
  if (!participant) {
    console.warn("submitScore: no participant record linked to this account, score not saved");
    return;
  }

  const { error: insertError } = await supabase.from("game_scores").insert({ participant_id: participant.id, game, score });
  if (insertError) {
    console.error("submitScore: insert failed", insertError.message);
  }
}

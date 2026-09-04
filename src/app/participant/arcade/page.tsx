import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";

// Always refetch on navigation — otherwise a quick "back to arcade" after
// finishing a game can show a stale (pre-score) leaderboard from the
// client-side route cache.
export const dynamic = "force-dynamic";

const GAMES = [
  { href: "/participant/arcade/trivia", key: "trivia", title: "Trivia Quiz", emoji: "🧠", blurb: "Test your tech knowledge" },
  { href: "/participant/arcade/memory", key: "memory", title: "Memory Match", emoji: "🃏", blurb: "Flip and find the pairs" },
  { href: "/participant/arcade/reaction", key: "reaction", title: "Reaction Time", emoji: "⚡", blurb: "How fast are your reflexes?" },
  { href: "/participant/arcade/2048", key: "game2048", title: "2048", emoji: "🔢", blurb: "Merge tiles to reach 2048" },
  { href: "/participant/arcade/flappy", key: "flappy", title: "Flappy Bird", emoji: "🐦", blurb: "Flap through the pipes" },
];

export default async function ArcadePage() {
  const supabase = await createClient();
  const { data: scores } = await supabase.from("game_scores").select("game, score, participants(name)").order("score", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Arcade</h1>
      <p className="text-slate-400 text-sm mb-6">Waiting between sessions? Play a quick game.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {GAMES.map((g) => (
          <Link key={g.key} href={g.href}>
            <Card className="p-5 hover:border-sky-500/40 transition h-full">
              <div className="text-3xl mb-2">{g.emoji}</div>
              <p className="font-semibold text-white">{g.title}</p>
              <p className="text-sm text-slate-400">{g.blurb}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="font-semibold text-white mb-3">Leaderboards</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GAMES.map((g) => {
          const top = (scores ?? [])
            .filter((s) => s.game === g.key)
            .slice(0, 5) as unknown as { score: number; participants: { name: string } | null }[];
          return (
            <Card key={g.key} className="p-4">
              <p className="text-sm font-semibold text-white mb-2">
                {g.emoji} {g.title}
              </p>
              {top.length === 0 ? (
                <p className="text-xs text-slate-500">No scores yet — be the first!</p>
              ) : (
                <ol className="text-sm space-y-1">
                  {top.map((s, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {i + 1}. {s.participants?.name ?? "—"}
                      </span>
                      <span className="font-medium">{s.score}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

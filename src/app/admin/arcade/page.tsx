"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Button, Input, Textarea } from "@/components/ui";
import type { QuizQuestion } from "@/types/database";

interface ScoreRow {
  participant_id: string;
  game: string;
  score: number;
  participants: { name: string; unique_code: string } | null;
}

export default function ArcadeAdminPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: q }, { data: s }] = await Promise.all([
      supabase.from("quiz_questions").select("*").order("order_index"),
      supabase
        .from("game_scores")
        .select("participant_id, game, score, participants(name, unique_code)")
        .order("score", { ascending: false })
        .limit(50),
    ]);
    setQuestions(q ?? []);
    setScores((s as unknown as ScoreRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || options.some((o) => !o.trim())) return;
    setSaving(true);
    const supabase = createClient();
    const nextOrder = questions.length ? Math.max(...questions.map((q) => q.order_index)) + 1 : 1;
    await supabase.from("quiz_questions").insert({
      question: question.trim(),
      options: options.map((o) => o.trim()),
      correct_index: correctIndex,
      order_index: nextOrder,
    });
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
    setSaving(false);
    load();
  }

  async function removeQuestion(id: string) {
    if (!confirm("Delete this question?")) return;
    const supabase = createClient();
    await supabase.from("quiz_questions").delete().eq("id", id);
    load();
  }

  const bestPerGame = ["trivia", "memory", "reaction", "game2048", "flappy"].map((game) => ({
    game,
    top: scores.filter((s) => s.game === game).slice(0, 5),
  }));

  return (
    <div>
      <PageHeader title="Arcade" description="Trivia questions and mini-game leaderboards." />

      <h2 className="font-semibold text-white mb-3">Trivia questions</h2>
      <Card className="p-4 mb-4">
        <form onSubmit={addQuestion} className="space-y-3">
          <Input placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} required />
          <div className="grid sm:grid-cols-2 gap-3">
            {options.map((opt, i) => (
              <label key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                  title="Mark as correct answer"
                />
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => setOptions((s) => s.map((o, oi) => (oi === i ? e.target.value : o)))}
                  required
                />
              </label>
            ))}
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add question"}
          </Button>
        </form>
      </Card>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-2 mb-8">
          {questions.map((q) => (
            <Card key={q.id} className="p-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{q.question}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Correct: <span className="font-medium">{q.options[q.correct_index]}</span>
                </p>
              </div>
              <Button variant="ghost" onClick={() => removeQuestion(q.id)}>
                Delete
              </Button>
            </Card>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-white mb-3">Leaderboards</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bestPerGame.map(({ game, top }) => (
          <Card key={game} className="p-4">
            <p className="text-sm font-semibold text-white capitalize mb-2">{game}</p>
            {top.length === 0 ? (
              <p className="text-xs text-slate-500">No scores yet.</p>
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
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, Button } from "@/components/ui";
import { submitScore } from "@/lib/scores";
import type { QuizQuestion } from "@/types/database";

export default function TriviaPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("quiz_questions").select("*").order("order_index");
    const shuffled = [...(data ?? [])].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function answer(optionIndex: number) {
    if (selected !== null) return;
    setSelected(optionIndex);
    const correct = optionIndex === questions[index].correct_index;
    const newScore = correct ? score + 10 : score;
    setScore(newScore);

    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex((i) => i + 1);
        setSelected(null);
      } else {
        setDone(true);
        if (!submitted) {
          submitScore("trivia", newScore);
          setSubmitted(true);
        }
      }
    }, 800);
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (questions.length === 0)
    return (
      <Card className="p-6 text-center text-sm text-slate-500">
        No trivia questions yet — check back once the organizers add some.
      </Card>
    );

  if (done) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto">
        <p className="text-4xl mb-2">🎉</p>
        <h2 className="text-xl font-bold text-white">You scored {score}</h2>
        <p className="text-sm text-slate-400 mt-1">out of {questions.length * 10}</p>
        <div className="flex gap-2 justify-center mt-6">
          <Button
            onClick={() => {
              setIndex(0);
              setScore(0);
              setSelected(null);
              setDone(false);
              setSubmitted(false);
              load();
            }}
          >
            Play again
          </Button>
          <Link href="/participant/arcade">
            <Button variant="secondary">Back to arcade</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const q = questions[index];

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-between text-sm text-slate-400 mb-3">
        <span>
          Question {index + 1} / {questions.length}
        </span>
        <span>Score: {score}</span>
      </div>
      <Card className="p-5">
        <h2 className="font-semibold text-white mb-4">{q.question}</h2>
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correct_index;
            const isSelected = i === selected;
            let style = "border-slate-800 hover:border-sky-500/40";
            if (selected !== null) {
              if (isCorrect) style = "border-emerald-500/50 bg-emerald-500/10";
              else if (isSelected) style = "border-red-500/50 bg-red-500/10";
            }
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={selected !== null}
                className={`w-full text-left border rounded-lg px-4 py-2.5 text-sm transition ${style}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

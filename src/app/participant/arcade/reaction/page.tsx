"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { submitScore } from "@/lib/scores";

type Phase = "idle" | "waiting" | "ready" | "tooSoon" | "result" | "done";

const ROUNDS = 5;

export default function ReactionGamePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [lastTime, setLastTime] = useState<number | null>(null);
  const startRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);

  function startRound() {
    setPhase("waiting");
    const delay = 1000 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setPhase("ready");
    }, delay);
  }

  function handleClick() {
    if (phase === "idle") {
      submittedRef.current = false;
      setTimes([]);
      startRound();
      return;
    }
    if (phase === "waiting") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPhase("tooSoon");
      return;
    }
    if (phase === "ready") {
      const reaction = Math.round(performance.now() - startRef.current);
      setLastTime(reaction);
      const next = [...times, reaction];
      setTimes(next);
      if (next.length >= ROUNDS) {
        setPhase("done");
        if (!submittedRef.current) {
          const avg = Math.round(next.reduce((a, b) => a + b, 0) / next.length);
          const score = Math.max(2000 - avg, 100);
          submitScore("reaction", score);
          submittedRef.current = true;
        }
      } else {
        setPhase("result");
      }
      return;
    }
    if (phase === "tooSoon" || phase === "result") {
      startRound();
    }
  }

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  const bg = { idle: "bg-indigo-600", waiting: "bg-amber-500", ready: "bg-emerald-500", tooSoon: "bg-red-500", result: "bg-indigo-600", done: "bg-indigo-600" }[phase];

  const label = {
    idle: "Click to start",
    waiting: "Wait for green…",
    ready: "Click now!",
    tooSoon: "Too soon! Click to retry",
    result: `${lastTime}ms — click for next round`,
    done: "Done!",
  }[phase];

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-3">Reaction Time</h1>
      <p className="text-sm text-slate-500 mb-4">Click as soon as the box turns green. {ROUNDS} rounds.</p>

      {phase !== "done" ? (
        <button
          onClick={handleClick}
          className={`w-full aspect-video rounded-xl ${bg} text-white text-xl font-semibold flex items-center justify-center transition select-none`}
        >
          {label}
        </button>
      ) : (
        <Card className="p-6 text-center">
          <p className="font-semibold text-slate-900">Average: {avg}ms 🎉</p>
          <p className="text-xs text-slate-500 mt-1">{times.join("ms, ")}ms</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button onClick={() => setPhase("idle")}>Play again</Button>
            <Link href="/participant/arcade">
              <Button variant="secondary">Back to arcade</Button>
            </Link>
          </div>
        </Card>
      )}

      {phase !== "idle" && phase !== "done" && (
        <p className="text-center text-xs text-slate-400 mt-3">
          Round {times.length + 1} / {ROUNDS}
        </p>
      )}
    </div>
  );
}

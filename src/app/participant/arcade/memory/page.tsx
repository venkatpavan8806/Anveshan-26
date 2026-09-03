"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { submitScore } from "@/lib/scores";

const EMOJIS = ["💻", "🚀", "⚡", "🎯", "🧩", "🔧", "🛠️", "📡"];

interface Cell {
  key: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function buildDeck(): Cell[] {
  const pairs = [...EMOJIS, ...EMOJIS];
  return pairs
    .map((emoji) => ({ emoji, sortKey: Math.random() }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((c, i) => ({ key: i, emoji: c.emoji, flipped: false, matched: false }));
}

export default function MemoryGamePage() {
  const [deck, setDeck] = useState<Cell[]>(() => buildDeck());
  const [openIndices, setOpenIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allMatched = deck.every((c) => c.matched);

  useEffect(() => {
    if (allMatched && !submitted) {
      const score = Math.max(1000 - moves * 20, 50);
      submitScore("memory", score);
      setSubmitted(true);
    }
  }, [allMatched, moves, submitted]);

  function flip(i: number) {
    if (locked || deck[i].flipped || deck[i].matched) return;
    const nextOpen = [...openIndices, i];
    setDeck((d) => d.map((c, ci) => (ci === i ? { ...c, flipped: true } : c)));

    if (nextOpen.length === 2) {
      setLocked(true);
      setMoves((m) => m + 1);
      const [a, b] = nextOpen;
      setTimeout(() => {
        setDeck((d) => {
          const match = d[a].emoji === d[b].emoji;
          return d.map((c, ci) =>
            ci === a || ci === b ? { ...c, matched: match, flipped: match } : c
          );
        });
        setOpenIndices([]);
        setLocked(false);
      }, 600);
    } else {
      setOpenIndices(nextOpen);
    }
  }

  function reset() {
    setDeck(buildDeck());
    setOpenIndices([]);
    setMoves(0);
    setSubmitted(false);
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold text-slate-900">Memory Match</h1>
        <span className="text-sm text-slate-500">Moves: {moves}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {deck.map((c, i) => (
          <button
            key={c.key}
            onClick={() => flip(i)}
            className={`aspect-square rounded-lg text-2xl flex items-center justify-center transition ${
              c.flipped || c.matched ? "bg-indigo-50 border-2 border-indigo-300" : "bg-slate-100 hover:bg-slate-200 border-2 border-transparent"
            }`}
          >
            {c.flipped || c.matched ? c.emoji : ""}
          </button>
        ))}
      </div>

      {allMatched && (
        <Card className="p-5 mt-4 text-center">
          <p className="font-semibold text-slate-900">Solved in {moves} moves! 🎉</p>
          <div className="flex gap-2 justify-center mt-3">
            <Button onClick={reset}>Play again</Button>
            <Link href="/participant/arcade">
              <Button variant="secondary">Back to arcade</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

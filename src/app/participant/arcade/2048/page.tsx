"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { submitScore } from "@/lib/scores";

const SIZE = 4;
type Grid = number[][];

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandomTile(grid: Grid): Grid {
  const empty: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((v, c) => v === 0 && empty.push([r, c])));
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideRowLeft(row: number[]): { row: number[]; gained: number } {
  const nonZero = row.filter((v) => v !== 0);
  const merged: number[] = [];
  let gained = 0;
  for (let i = 0; i < nonZero.length; i++) {
    if (nonZero[i] === nonZero[i + 1]) {
      const value = nonZero[i] * 2;
      merged.push(value);
      gained += value;
      i++;
    } else {
      merged.push(nonZero[i]);
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { row: merged, gained };
}

function rotateGrid(grid: Grid): Grid {
  const next = emptyGrid();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) next[c][SIZE - 1 - r] = grid[r][c];
  return next;
}

function move(grid: Grid, direction: "left" | "right" | "up" | "down") {
  let working = grid;
  let rotations = 0;
  if (direction === "up") rotations = 3;
  if (direction === "right") rotations = 2;
  if (direction === "down") rotations = 1;
  for (let i = 0; i < rotations; i++) working = rotateGrid(working);

  let gained = 0;
  let moved = false;
  const result = working.map((row, i) => {
    const { row: newRow, gained: g } = slideRowLeft(row);
    gained += g;
    if (newRow.some((v, idx) => v !== working[i][idx])) moved = true;
    return newRow;
  });

  let final = result;
  for (let i = 0; i < (4 - rotations) % 4; i++) final = rotateGrid(final);

  return { grid: final, gained, moved };
}

function canMove(grid: Grid) {
  for (const dir of ["left", "right", "up", "down"] as const) {
    if (move(grid, dir).moved) return true;
  }
  return false;
}

const TILE_COLORS: Record<number, string> = {
  2: "bg-slate-100 text-slate-800",
  4: "bg-slate-200 text-slate-800",
  8: "bg-amber-200 text-amber-900",
  16: "bg-amber-300 text-amber-900",
  32: "bg-orange-300 text-white",
  64: "bg-orange-400 text-white",
  128: "bg-yellow-300 text-white",
  256: "bg-yellow-400 text-white",
  512: "bg-yellow-500 text-white",
  1024: "bg-indigo-400 text-white",
  2048: "bg-indigo-600 text-white",
};

export default function Game2048Page() {
  const [grid, setGrid] = useState<Grid>(() => addRandomTile(addRandomTile(emptyGrid())));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const submittedRef = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleMove = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (gameOver) return;
      setGrid((g) => {
        const { grid: next, gained, moved } = move(g, direction);
        if (!moved) return g;
        const withTile = addRandomTile(next);
        setScore((s) => s + gained);
        if (!canMove(withTile)) {
          setGameOver(true);
        }
        return withTile;
      });
    },
    [gameOver]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      if (map[e.key]) {
        e.preventDefault();
        handleMove(map[e.key]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleMove]);

  useEffect(() => {
    if (gameOver && !submittedRef.current) {
      submitScore("game2048", score);
      submittedRef.current = true;
    }
  }, [gameOver, score]);

  function reset() {
    setGrid(addRandomTile(addRandomTile(emptyGrid())));
    setScore(0);
    setGameOver(false);
    submittedRef.current = false;
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? "right" : "left");
    else handleMove(dy > 0 ? "down" : "up");
    touchStart.current = null;
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold text-slate-900">2048</h1>
        <span className="text-sm font-semibold text-slate-700">Score: {score}</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">Arrow keys, or swipe on mobile.</p>

      <div
        className="bg-slate-300 rounded-xl p-2 grid grid-cols-4 gap-2 touch-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {grid.flat().map((v, i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg flex items-center justify-center font-bold text-lg ${
              v ? TILE_COLORS[v] ?? "bg-indigo-700 text-white" : "bg-slate-200/60"
            }`}
          >
            {v || ""}
          </div>
        ))}
      </div>

      {gameOver && (
        <Card className="p-5 mt-4 text-center">
          <p className="font-semibold text-slate-900">Game over — score {score} 🎉</p>
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

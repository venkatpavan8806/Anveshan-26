"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { submitScore } from "@/lib/scores";

const WIDTH = 360;
const HEIGHT = 520;
const GRAVITY = 0.45;
const FLAP_VELOCITY = -7.5;
const BIRD_X = 90;
const BIRD_RADIUS = 12;
const PIPE_WIDTH = 56;
const PIPE_GAP = 150;
const PIPE_SPACING = 210;
const PIPE_SPEED = 2.4;
const GROUND_HEIGHT = 60;

interface Pipe {
  x: number;
  gapY: number; // center of the gap
  passed: boolean;
}

type Phase = "ready" | "playing" | "over";

export default function FlappyBirdPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const birdYRef = useRef(HEIGHT / 2);
  const velocityRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const stored = Number(localStorage.getItem("anveshan-flappy-best") ?? 0);
    if (!Number.isNaN(stored)) setBest(stored);
  }, []);

  const resetGame = useCallback(() => {
    birdYRef.current = HEIGHT / 2;
    velocityRef.current = 0;
    scoreRef.current = 0;
    submittedRef.current = false;
    pipesRef.current = [
      { x: WIDTH + 60, gapY: 220, passed: false },
      { x: WIDTH + 60 + PIPE_SPACING, gapY: 260, passed: false },
      { x: WIDTH + 60 + PIPE_SPACING * 2, gapY: 200, passed: false },
    ];
    setScore(0);
  }, []);

  const flap = useCallback(() => {
    if (phaseRef.current === "ready") {
      resetGame();
      phaseRef.current = "playing";
      setPhase("playing");
    }
    if (phaseRef.current === "over") {
      resetGame();
      phaseRef.current = "playing";
      setPhase("playing");
      return;
    }
    velocityRef.current = FLAP_VELOCITY;
  }, [resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function endGame() {
      phaseRef.current = "over";
      setPhase("over");
      if (!submittedRef.current) {
        submittedRef.current = true;
        submitScore("flappy", scoreRef.current);
        setBest((b) => {
          const next = Math.max(b, scoreRef.current);
          localStorage.setItem("anveshan-flappy-best", String(next));
          return next;
        });
      }
    }

    function tick() {
      if (!ctx || !canvas) return;

      if (phaseRef.current === "playing") {
        velocityRef.current += GRAVITY;
        birdYRef.current += velocityRef.current;

        if (birdYRef.current - BIRD_RADIUS < 0) {
          birdYRef.current = BIRD_RADIUS;
          velocityRef.current = 0;
        }
        if (birdYRef.current + BIRD_RADIUS > HEIGHT - GROUND_HEIGHT) {
          endGame();
        }

        for (const pipe of pipesRef.current) {
          pipe.x -= PIPE_SPEED;

          const withinX = BIRD_X + BIRD_RADIUS > pipe.x && BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH;
          const topEdge = pipe.gapY - PIPE_GAP / 2;
          const bottomEdge = pipe.gapY + PIPE_GAP / 2;
          const withinGap = birdYRef.current - BIRD_RADIUS > topEdge && birdYRef.current + BIRD_RADIUS < bottomEdge;
          if (withinX && !withinGap) endGame();

          if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
        }

        pipesRef.current = pipesRef.current.filter((p) => p.x > -PIPE_WIDTH);
        while (pipesRef.current.length < 3) {
          const last = pipesRef.current[pipesRef.current.length - 1];
          pipesRef.current.push({
            x: (last?.x ?? WIDTH) + PIPE_SPACING,
            gapY: 130 + Math.random() * (HEIGHT - GROUND_HEIGHT - 260),
            passed: false,
          });
        }
      }

      // sky
      const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      grad.addColorStop(0, "#0a0f24");
      grad.addColorStop(1, "#132352");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // pipes
      ctx.fillStyle = "#38bdf8";
      for (const pipe of pipesRef.current) {
        const topEdge = pipe.gapY - PIPE_GAP / 2;
        const bottomEdge = pipe.gapY + PIPE_GAP / 2;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topEdge);
        ctx.fillRect(pipe.x, bottomEdge, PIPE_WIDTH, HEIGHT - GROUND_HEIGHT - bottomEdge);
      }

      // ground
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, HEIGHT - GROUND_HEIGHT, WIDTH, GROUND_HEIGHT);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, HEIGHT - GROUND_HEIGHT, WIDTH, 6);

      // bird
      ctx.beginPath();
      ctx.arc(BIRD_X, birdYRef.current, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#facc15";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(BIRD_X + 4, birdYRef.current - 3, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0f24";
      ctx.fill();

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold text-white">Flappy Bird</h1>
        <span className="text-sm text-slate-400">
          Score: {score} · Best: {best}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-3">Space / tap / click to flap. Don&apos;t hit the pipes.</p>

      <div className="relative mx-auto" style={{ width: WIDTH, maxWidth: "100%" }}>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onClick={flap}
          className="rounded-xl border border-slate-800 w-full touch-none cursor-pointer"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        />
        {phase !== "playing" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="p-5 text-center bg-slate-900/90">
              {phase === "ready" ? (
                <>
                  <p className="font-semibold text-white mb-3">Tap to start</p>
                  <Button onClick={flap}>Start</Button>
                </>
              ) : (
                <>
                  <p className="font-semibold text-white">Game over — score {score} 🎉</p>
                  <div className="flex gap-2 justify-center mt-3">
                    <Button onClick={flap}>Play again</Button>
                    <Link href="/participant/arcade">
                      <Button variant="secondary">Back to arcade</Button>
                    </Link>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

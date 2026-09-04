"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input, Badge } from "@/components/ui";
import { playBeep } from "@/lib/beep";
import { statusTone, statusLabel } from "@/lib/utils";
import type { Participant } from "@/types/database";

const READER_ID = "qr-reader";

type FoundParticipant = Participant & { teams: { name: string } | null };

export default function ScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [running, setRunning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [gateLabel, setGateLabel] = useState("Main Gate");
  const [manualCode, setManualCode] = useState("");

  const [found, setFound] = useState<FoundParticipant | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState<{ name: string; action: "CHECK_IN" | "CHECK_OUT" } | null>(null);

  const busyRef = useRef(false);

  const lookupCode = useCallback(async (rawCode: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLookupError(null);
    setFound(null);
    setLastResult(null);

    const code = rawCode.trim().toUpperCase();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("participants")
      .select("*, teams(name)")
      .eq("unique_code", code)
      .maybeSingle();

    if (error || !data) {
      setLookupError(`No participant found for code "${code}"`);
      playBeep("error");
    } else {
      setFound(data as unknown as FoundParticipant);
      playBeep("success");
    }
    busyRef.current = false;
  }, []);

  useEffect(() => {
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          if (!busyRef.current) lookupCode(decodedText);
        },
        () => {
          /* per-frame decode miss — ignore */
        }
      )
      .then(() => setRunning(true))
      .catch((err) => setCameraError(err?.message ?? "Could not access camera"));

    return () => {
      // .stop() throws synchronously (not just a rejected promise) if the
      // camera never actually started (denied/slow permission, or this
      // effect re-running before start() resolved) — guard on isScanning.
      if (scanner.isScanning) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      } else {
        try {
          scanner.clear();
        } catch {
          // nothing to clear
        }
      }
    };
  }, [lookupCode]);

  async function confirmToggle() {
    if (!found) return;
    setConfirming(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("toggle_participant_status", {
      p_participant_id: found.id,
      p_gate_label: gateLabel || null,
    });

    if (error) {
      setLookupError(error.message);
    } else {
      const newStatus = (data as Participant).status;
      setLastResult({ name: found.name, action: newStatus === "IN" ? "CHECK_IN" : "CHECK_OUT" });
      playBeep("success");
    }
    setFound(null);
    setConfirming(false);
  }

  function dismiss() {
    setFound(null);
    setLookupError(null);
  }

  function submitManualCode(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim() || busyRef.current) return;
    lookupCode(manualCode);
    setManualCode("");
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-4 mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-1">Gate label</label>
        <Input value={gateLabel} onChange={(e) => setGateLabel(e.target.value)} placeholder="e.g. Main Gate" />
      </Card>

      <Card className="p-4 mb-4">
        <div id={READER_ID} className="rounded-lg overflow-hidden" />
        {cameraError && <p className="text-sm text-red-400 mt-2">{cameraError}</p>}
        {!running && !cameraError && <p className="text-sm text-slate-500 mt-2">Starting camera…</p>}
      </Card>

      <Card className="p-4 mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Or type their code (participant shows you their ID from their profile)
        </label>
        <form onSubmit={submitManualCode} className="flex gap-2">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="ANV-0001"
            className="uppercase"
          />
          <Button type="submit">Look up</Button>
        </form>
      </Card>

      {lastResult && (
        <Card className={`p-4 mb-4 border-2 ${lastResult.action === "CHECK_IN" ? "border-emerald-500/50" : "border-amber-400"}`}>
          <p className="font-semibold text-white">{lastResult.name}</p>
          <Badge tone={lastResult.action === "CHECK_IN" ? "green" : "amber"}>
            {lastResult.action === "CHECK_IN" ? "Checked IN" : "Checked OUT"}
          </Badge>
        </Card>
      )}

      {lookupError && (
        <Card className="p-4 mb-4 border-2 border-red-500/40">
          <p className="text-sm text-red-400">{lookupError}</p>
          <Button variant="secondary" className="mt-3" onClick={dismiss}>
            Dismiss
          </Button>
        </Card>
      )}

      {found && (
        <Card className="p-4 border-2 border-sky-500/40">
          <div className="flex items-center gap-3 mb-3">
            {found.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={found.photo_url} alt={found.name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-800" />
            )}
            <div>
              <p className="font-semibold text-white">{found.name}</p>
              <p className="text-xs text-slate-400">
                {found.unique_code} {found.teams?.name ? `· ${found.teams.name}` : ""}
              </p>
              <Badge tone={statusTone(found.status)}>{statusLabel(found.status)}</Badge>
            </div>
          </div>
          <p className="text-sm text-slate-300 mb-3">
            Confirm to mark this participant as{" "}
            <span className="font-semibold">{found.status === "IN" ? "CHECKED OUT" : "CHECKED IN"}</span>.
          </p>
          <div className="flex gap-2">
            <Button onClick={confirmToggle} disabled={confirming} className="flex-1">
              {confirming ? "Updating…" : found.status === "IN" ? "Confirm check-out" : "Confirm check-in"}
            </Button>
            <Button variant="secondary" onClick={dismiss}>
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

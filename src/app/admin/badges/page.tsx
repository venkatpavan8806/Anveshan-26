"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Button } from "@/components/ui";
import { buildBadgePdf, downloadBytes } from "@/lib/badge";
import type { Participant } from "@/types/database";

type Row = Participant & { teams: { name: string } | null };

export default function BadgesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("participants").select("*, teams(name)").order("unique_code");
    setRows((data as unknown as Row[]) ?? []);
    setSelected(new Set((data ?? []).map((r) => r.id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function generate() {
    const chosen = rows.filter((r) => selected.has(r.id));
    if (chosen.length === 0) return;
    setGenerating(true);
    const bytes = await buildBadgePdf(
      chosen.map((r) => ({ name: r.name, unique_code: r.unique_code, teamName: r.teams?.name ?? null }))
    );
    downloadBytes(bytes, `anveshan-badges-${chosen.length}.pdf`);
    setGenerating(false);
  }

  return (
    <div>
      <PageHeader
        title="Batch badge printing"
        description="Select participants and download one printable PDF (2 badges per row, cut along the light borders)."
        action={
          <Button onClick={generate} disabled={generating || selected.size === 0}>
            {generating ? "Generating…" : `Generate PDF (${selected.size})`}
          </Button>
        }
      />

      <Card className="p-3 mb-4 flex gap-3">
        <Button variant="secondary" onClick={() => setSelected(new Set(rows.map((r) => r.id)))}>
          Select all
        </Button>
        <Button variant="secondary" onClick={() => setSelected(new Set())}>
          Clear
        </Button>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2 w-10"></th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => toggle(r.id)}>
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{r.unique_code}</td>
                    <td className="px-4 py-2 font-medium text-slate-900">{r.name}</td>
                    <td className="px-4 py-2 text-slate-500">{r.teams?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

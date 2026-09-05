"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Input, Select, Badge, Button } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

interface LogRow {
  id: string;
  action: "CHECK_IN" | "CHECK_OUT";
  timestamp: string;
  gate_label: string | null;
  reason: string | null;
  participants: { name: string; unique_code: string } | null;
  scanner: { name: string } | null;
}

export default function MovementLogPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("movement_logs")
      .select("id, action, timestamp, gate_label, reason, participants(name, unique_code), scanner:scanned_by(name)")
      .order("timestamp", { ascending: false })
      .limit(1000);
    setRows((data as unknown as LogRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.participants?.name.toLowerCase().includes(q) ||
      r.participants?.unique_code.toLowerCase().includes(q) ||
      r.gate_label?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q);
    const matchesAction = !actionFilter || r.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  function exportCsv() {
    const header = "name,code,action,timestamp,gate,reason,scanned_by\n";
    const body = filtered
      .map((r) =>
        [
          r.participants?.name ?? "",
          r.participants?.unique_code ?? "",
          r.action,
          r.timestamp,
          r.gate_label ?? "",
          r.reason ?? "",
          r.scanner?.name ?? "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movement-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Movement Log"
        description={`${filtered.length} of ${rows.length} entries`}
        action={<Button onClick={exportCsv}>Export CSV</Button>}
      />

      <Card className="p-4 mb-4 grid sm:grid-cols-2 gap-3">
        <Input placeholder="Search name, code, gate…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">All actions</option>
          <option value="CHECK_IN">Check-in only</option>
          <option value="CHECK_OUT">Check-out only</option>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No entries match.</p>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-left text-xs text-slate-400 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2">Participant</th>
                  <th className="px-4 py-2">Action</th>
                  <th className="px-4 py-2">Gate</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2">Scanned by</th>
                  <th className="px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">
                      <p className="font-medium text-white">{r.participants?.name ?? "—"}</p>
                      <p className="text-xs text-slate-500 font-mono">{r.participants?.unique_code}</p>
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={r.action === "CHECK_IN" ? "green" : "amber"}>
                        {r.action === "CHECK_IN" ? "IN" : "OUT"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-400">{r.gate_label ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-400">{r.reason ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-400">{r.scanner?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-400">{formatDateTime(r.timestamp)}</td>
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Button, Input, Select } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { ScheduleSlot, Team, SlotStatus } from "@/types/database";

type Row = ScheduleSlot & { teams: { name: string } | null };

export default function SchedulePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [teamId, setTeamId] = useState("");
  const [title, setTitle] = useState("Final Presentation");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: slots }, { data: teamRows }] = await Promise.all([
      supabase.from("schedule_slots").select("*, teams(name)").order("start_time"),
      supabase.from("teams").select("*").order("name"),
    ]);
    setRows((slots as unknown as Row[]) ?? []);
    setTeams(teamRows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !start || !end) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("schedule_slots").insert({
      team_id: teamId,
      title: title.trim(),
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      location: location.trim() || null,
    } as Partial<ScheduleSlot>);
    setTeamId("");
    setStart("");
    setEnd("");
    setLocation("");
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function updateStatus(id: string, status: SlotStatus) {
    const supabase = createClient();
    await supabase.from("schedule_slots").update({ status }).eq("id", id);
    load();
  }

  async function removeSlot(id: string) {
    if (!confirm("Delete this slot?")) return;
    const supabase = createClient();
    await supabase.from("schedule_slots").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Presentation Schedule"
        description="Participants see their own team's slot on 'My Schedule', and the full list on the Timeline."
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Add slot"}</Button>}
      />

      {showForm && (
        <Card className="p-4 mb-6">
          <form onSubmit={addSlot} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Team</label>
              <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} required>
                <option value="">Select team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Start</label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">End</label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Location / Stage</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="lg:col-span-5">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Add slot"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">No slots scheduled yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Team</th>
                  <th className="px-4 py-2">Title</th>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-medium text-slate-900">{r.teams?.name ?? "—"}</td>
                    <td className="px-4 py-2">{r.title}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {formatDateTime(r.start_time)} – {formatDateTime(r.end_time)}
                    </td>
                    <td className="px-4 py-2 text-slate-500">{r.location ?? "—"}</td>
                    <td className="px-4 py-2">
                      <Select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value as SlotStatus)}
                        className="text-xs py-1"
                      >
                        <option value="UPCOMING">Upcoming</option>
                        <option value="READY_CALL">Ready call</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="DONE">Done</option>
                      </Select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" onClick={() => removeSlot(r.id)}>
                        Delete
                      </Button>
                    </td>
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

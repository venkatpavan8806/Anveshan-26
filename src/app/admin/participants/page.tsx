"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Button, Input, Select, Badge } from "@/components/ui";
import type { Participant, Team } from "@/types/database";

type Row = Participant & { teams: { name: string } | null };

export default function ParticipantsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [teamId, setTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: participants }, { data: teamRows }] = await Promise.all([
      supabase.from("participants").select("*, teams(name)").order("created_at", { ascending: false }),
      supabase.from("teams").select("*").order("name"),
    ]);
    setRows((participants as unknown as Row[]) ?? []);
    setTeams(teamRows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { data: code, error: codeError } = await supabase.rpc("next_participant_code");
    if (codeError || !code) {
      setError(codeError?.message ?? "Could not generate a code");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("participants").insert({
      unique_code: code,
      name: name.trim(),
      contact: contact.trim() || null,
      team_id: teamId || null,
      qr_data: code,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setName("");
    setContact("");
    setTeamId("");
    setShowForm(false);
    setSaving(false);
    load();
  }

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.unique_code.toLowerCase().includes(q) ||
      r.teams?.name.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Participants"
        description={`${rows.length} registered`}
        action={
          <div className="flex gap-2">
            <Link href="/admin/participants/import">
              <Button variant="secondary">Bulk import CSV</Button>
            </Link>
            <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Add participant"}</Button>
          </div>
        }
      />

      {showForm && (
        <Card className="p-4 mb-6">
          <form onSubmit={addParticipant} className="grid sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Contact</label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Team</label>
              <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                <option value="">— none —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-4 flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save participant"}
              </Button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </form>
        </Card>
      )}

      <Card className="p-4 mb-4">
        <Input placeholder="Search by name, code, or team…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">No participants found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Team</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 font-mono text-xs">{p.unique_code}</td>
                    <td className="px-4 py-2 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-2 text-slate-600">{p.teams?.name ?? "—"}</td>
                    <td className="px-4 py-2">
                      <Badge tone={p.status === "IN" ? "green" : "amber"}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/admin/participants/${p.id}`} className="text-indigo-600 hover:underline text-sm">
                        View / Badge
                      </Link>
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

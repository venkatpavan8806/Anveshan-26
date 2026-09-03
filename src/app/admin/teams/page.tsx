"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Button, Input } from "@/components/ui";
import type { Team } from "@/types/database";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("teams").select("*").order("name");
    setTeams(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("teams")
      .insert({ name: name.trim(), project_title: projectTitle.trim() || null });
    if (!error) {
      setName("");
      setProjectTitle("");
      load();
    }
    setSaving(false);
  }

  async function updateProject(id: string, project_title: string) {
    const supabase = createClient();
    await supabase.from("teams").update({ project_title: project_title || null }).eq("id", id);
    load();
  }

  async function removeTeam(id: string) {
    if (!confirm("Delete this team? Participants in it will become unassigned.")) return;
    const supabase = createClient();
    await supabase.from("teams").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <PageHeader title="Teams" description="Teams group participants and drive the presentation schedule." />

      <Card className="p-4 mb-6">
        <form onSubmit={addTeam} className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            placeholder="Project title (optional)"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
          />
          <Button type="submit" disabled={saving}>
            Add Team
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-slate-400">Loading…</p>
        ) : teams.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">No teams yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Project Title</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{t.name}</td>
                  <td className="px-4 py-2">
                    <Input
                      value={editing[t.id] ?? t.project_title ?? ""}
                      onChange={(e) => setEditing((s) => ({ ...s, [t.id]: e.target.value }))}
                      onBlur={(e) => updateProject(t.id, e.target.value)}
                      className="max-w-xs"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" onClick={() => removeTeam(t.id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

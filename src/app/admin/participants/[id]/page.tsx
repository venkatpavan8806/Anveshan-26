"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Button, Input, Select, Badge } from "@/components/ui";
import { qrDataUrl, buildBadgePdf, downloadBytes } from "@/lib/badge";
import { formatDateTime, statusTone, statusLabel } from "@/lib/utils";
import type { Participant, Team, MovementLog } from "@/types/database";

export default function ParticipantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [logs, setLogs] = useState<MovementLog[]>([]);
  const [qr, setQr] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: p }, { data: t }, { data: l }] = await Promise.all([
      supabase.from("participants").select("*").eq("id", id).single(),
      supabase.from("teams").select("*").order("name"),
      supabase.from("movement_logs").select("*").eq("participant_id", id).order("timestamp", { ascending: false }),
    ]);
    setParticipant(p);
    setTeams(t ?? []);
    setLogs(l ?? []);
    if (p) setQr(await qrDataUrl(p.qr_data));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateField(field: keyof Participant, value: string | null) {
    if (!participant) return;
    const supabase = createClient();
    setSaving(true);
    await supabase
      .from("participants")
      .update({ [field]: value } as Partial<Participant>)
      .eq("id", participant.id);
    setSaving(false);
    load();
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !participant) return;
    setUploading(true);
    const supabase = createClient();
    const path = `photos/${participant.id}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("anveshan").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("anveshan").getPublicUrl(path);
      await supabase.from("participants").update({ photo_url: data.publicUrl }).eq("id", participant.id);
      load();
    }
    setUploading(false);
  }

  async function downloadBadge() {
    if (!participant) return;
    const teamName = teams.find((t) => t.id === participant.team_id)?.name ?? null;
    const bytes = await buildBadgePdf([{ name: participant.name, unique_code: participant.unique_code, teamName }]);
    downloadBytes(bytes, `${participant.unique_code}-badge.pdf`);
  }

  async function deleteParticipant() {
    if (!participant || !confirm(`Delete ${participant.name}? This also deletes their movement history.`)) return;
    const supabase = createClient();
    await supabase.from("participants").delete().eq("id", participant.id);
    router.push("/admin/participants");
  }

  if (!participant) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div>
      <PageHeader
        title={participant.name}
        description={participant.unique_code}
        action={<Badge tone={statusTone(participant.status)}>{statusLabel(participant.status)}</Badge>}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 flex flex-col items-center text-center">
          {participant.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={participant.photo_url} alt={participant.name} className="w-24 h-24 rounded-full object-cover mb-3" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-100 mb-3" />
          )}
          <label className="text-xs text-indigo-600 hover:underline cursor-pointer mb-4">
            {uploading ? "Uploading…" : "Upload photo"}
            <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
          </label>

          {qr && <img src={qr} alt="QR code" className="w-40 h-40" />}
          <Button className="mt-4 w-full" onClick={downloadBadge}>
            Download badge PDF
          </Button>
        </Card>

        <Card className="p-5 lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-slate-900">Details</h2>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
            <Input defaultValue={participant.name} onBlur={(e) => updateField("name", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Contact</label>
            <Input defaultValue={participant.contact ?? ""} onBlur={(e) => updateField("contact", e.target.value || null)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Team</label>
            <Select
              defaultValue={participant.team_id ?? ""}
              onChange={(e) => updateField("team_id", e.target.value || null)}
            >
              <option value="">— none —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          {saving && <p className="text-xs text-slate-400">Saving…</p>}
          <div className="pt-2">
            <Button variant="danger" onClick={deleteParticipant}>
              Delete participant
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-4 mt-6">
        <h2 className="font-semibold text-slate-900 mb-3">Movement history</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">No movement recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((l) => (
              <li key={l.id} className="py-2 flex items-center justify-between text-sm">
                <span>
                  <Badge tone={l.action === "CHECK_IN" ? "green" : "amber"}>{l.action === "CHECK_IN" ? "IN" : "OUT"}</Badge>
                  {l.gate_label && <span className="text-slate-500 ml-2">{l.gate_label}</span>}
                </span>
                <span className="text-slate-500">{formatDateTime(l.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

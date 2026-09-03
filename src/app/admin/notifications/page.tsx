"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Button, Input, Select, Textarea, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { Notification, Team, Participant, NotificationTarget, NotificationType } from "@/types/database";

export default function NotificationsAdminPage() {
  const [sent, setSent] = useState<Notification[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<NotificationTarget>("ALL");
  const [targetId, setTargetId] = useState("");
  const [type, setType] = useState<NotificationType>("INFO");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: notifs }, { data: teamRows }, { data: participantRows }] = await Promise.all([
      supabase.from("notifications").select("*").order("sent_at", { ascending: false }),
      supabase.from("teams").select("*").order("name"),
      supabase.from("participants").select("*").order("name"),
    ]);
    setSent(notifs ?? []);
    setTeams(teamRows ?? []);
    setParticipants(participantRows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    const res = await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, target, target_id: targetId || null, type }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(`Error: ${data.error}`);
    } else {
      setStatus(`Sent to ${data.push.recipients} recipient(s), ${data.push.sent} push notification(s) delivered.`);
      setTitle("");
      setBody("");
      setTargetId("");
      load();
    }
    setSending(false);
  }

  return (
    <div>
      <PageHeader title="Notifications" description="In-app + browser push, delivered instantly to the chosen audience." />

      <Card className="p-4 mb-6">
        <form onSubmit={send} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Select value={type} onChange={(e) => setType(e.target.value as NotificationType)}>
              <option value="INFO">Info</option>
              <option value="READY_CALL">Ready call</option>
              <option value="PRESENTATION_TIME">Presentation time</option>
            </Select>
          </div>
          <Textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={3} required />
          <div className="grid sm:grid-cols-2 gap-3">
            <Select
              value={target}
              onChange={(e) => {
                setTarget(e.target.value as NotificationTarget);
                setTargetId("");
              }}
            >
              <option value="ALL">Everyone</option>
              <option value="TEAM">A specific team</option>
              <option value="PARTICIPANT">A specific participant</option>
            </Select>
            {target === "TEAM" && (
              <Select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
                <option value="">Select team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            )}
            {target === "PARTICIPANT" && (
              <Select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
                <option value="">Select participant</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unique_code})
                  </option>
                ))}
              </Select>
            )}
          </div>
          <Button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send notification"}
          </Button>
          {status && <p className="text-sm text-slate-600">{status}</p>}
        </form>
      </Card>

      <h2 className="font-semibold text-slate-900 mb-3">Sent notifications</h2>
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : sent.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing sent yet.</p>
      ) : (
        <div className="space-y-3">
          {sent.map((n) => (
            <Card key={n.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{n.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>
                </div>
                <Badge tone={n.type === "PRESENTATION_TIME" ? "indigo" : n.type === "READY_CALL" ? "amber" : "default"}>
                  {n.type.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {n.target} · {formatDateTime(n.sent_at)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

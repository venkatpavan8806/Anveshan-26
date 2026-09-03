"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Button, Input, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { TimelineEvent } from "@/types/database";

export default function TimelineAdminPage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("timeline_events").select("*").order("start_time");
    setEvents(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !start) return;
    setSaving(true);
    const supabase = createClient();
    const nextOrder = events.length ? Math.max(...events.map((ev) => ev.order_index)) + 1 : 1;
    await supabase.from("timeline_events").insert({
      title: title.trim(),
      description: description.trim() || null,
      start_time: new Date(start).toISOString(),
      end_time: end ? new Date(end).toISOString() : null,
      order_index: nextOrder,
    });
    setTitle("");
    setDescription("");
    setStart("");
    setEnd("");
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function removeEvent(id: string) {
    if (!confirm("Delete this timeline event?")) return;
    const supabase = createClient();
    await supabase.from("timeline_events").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Event Timeline"
        description="Chronological event list shown to all participants (merged with the presentation schedule)."
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Add event"}</Button>}
      />

      {showForm && (
        <Card className="p-4 mb-6">
          <form onSubmit={addEvent} className="grid sm:grid-cols-2 gap-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required className="sm:col-span-2" />
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="sm:col-span-2"
            />
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Start</label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">End (optional)</label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving} className="sm:col-span-2 w-fit">
              {saving ? "Adding…" : "Add event"}
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <Card key={ev.id} className="p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">{ev.title}</p>
                {ev.description && <p className="text-sm text-slate-500 mt-0.5">{ev.description}</p>}
                <p className="text-xs text-slate-400 mt-1">
                  {formatDateTime(ev.start_time)}
                  {ev.end_time ? ` – ${formatDateTime(ev.end_time)}` : ""}
                </p>
              </div>
              <Button variant="ghost" onClick={() => removeEvent(ev.id)}>
                Delete
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

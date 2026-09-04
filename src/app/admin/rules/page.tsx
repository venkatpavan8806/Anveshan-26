"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Button, Input, Textarea } from "@/components/ui";
import type { Rule } from "@/types/database";

export default function RulesAdminPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("rules").select("*").order("order_index");
    setRules(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addSection(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const nextOrder = rules.length ? Math.max(...rules.map((r) => r.order_index)) + 1 : 1;
    await supabase.from("rules").insert({ section_title: title.trim(), content, order_index: nextOrder });
    setTitle("");
    setContent("");
    setSaving(false);
    load();
  }

  async function updateSection(id: string, field: "section_title" | "content", value: string) {
    const supabase = createClient();
    await supabase
      .from("rules")
      .update({ [field]: value } as Partial<Rule>)
      .eq("id", id);
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = rules.findIndex((r) => r.id === id);
    const swapWith = rules[idx + dir];
    if (!swapWith) return;
    const supabase = createClient();
    await Promise.all([
      supabase.from("rules").update({ order_index: swapWith.order_index }).eq("id", rules[idx].id),
      supabase.from("rules").update({ order_index: rules[idx].order_index }).eq("id", swapWith.id),
    ]);
    load();
  }

  async function removeSection(id: string) {
    if (!confirm("Delete this rules section?")) return;
    const supabase = createClient();
    await supabase.from("rules").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <PageHeader title="Rules" description="Markdown-supported sections, shown in order on the participant Rules page." />

      <Card className="p-4 mb-6">
        <form onSubmit={addSection} className="space-y-3">
          <Input placeholder="Section title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            placeholder="Content (markdown supported: **bold**, *italic*, lists, links)"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add section"}
          </Button>
        </form>
      </Card>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {rules.map((r, i) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <Input
                  defaultValue={r.section_title}
                  onBlur={(e) => updateSection(r.id, "section_title", e.target.value)}
                  className="font-semibold max-w-md"
                />
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" onClick={() => move(r.id, -1)} disabled={i === 0}>
                    ↑
                  </Button>
                  <Button variant="ghost" onClick={() => move(r.id, 1)} disabled={i === rules.length - 1}>
                    ↓
                  </Button>
                  <Button variant="ghost" onClick={() => removeSection(r.id)}>
                    Delete
                  </Button>
                </div>
              </div>
              <Textarea defaultValue={r.content} rows={4} onBlur={(e) => updateSection(r.id, "content", e.target.value)} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

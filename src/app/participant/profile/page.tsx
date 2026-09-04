"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input } from "@/components/ui";
import { qrDataUrl } from "@/lib/badge";
import type { Participant } from "@/types/database";

export default function ProfilePage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [qr, setQr] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from("participants").select("*").eq("profile_id", user.id).maybeSingle();
    if (data) {
      setParticipant(data);
      setName(data.name);
      setContact(data.contact ?? "");
      setQr(await qrDataUrl(data.qr_data));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("update_my_profile", {
      p_name: name.trim(),
      p_contact: contact.trim() || null,
    });
    setStatus(error ? error.message : "Saved.");
    setSaving(false);
    load();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  if (!participant) {
    return (
      <Card className="p-6 text-center text-sm text-slate-400">
        No participant record is linked to your account yet — contact an organizer.
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">My Profile</h1>
      <p className="text-slate-400 text-sm mb-6">
        Your ID and QR are what a volunteer scans (or types in) at the gate — show them this when you leave or return.
      </p>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 flex flex-col items-center text-center">
          {qr && <img src={qr} alt="QR code" className="w-40 h-40 rounded-lg bg-white p-2" />}
          <p className="font-mono text-lg font-bold text-white mt-4 tracking-wide">{participant.unique_code}</p>
          <p className="text-xs text-slate-500 mt-1">Your gate ID</p>
        </Card>

        <Card className="p-5 lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-white">Your info</h2>
          <form onSubmit={saveInfo} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Contact</label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {status && <p className="text-sm text-slate-400">{status}</p>}
          </form>
        </Card>
      </div>
    </div>
  );
}

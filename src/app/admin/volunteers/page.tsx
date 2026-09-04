"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Button, Input, Select, Badge } from "@/components/ui";
import type { Profile } from "@/types/database";

export default function VolunteersPage() {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"VOLUNTEER" | "ADMIN">("VOLUNTEER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").in("role", ["ADMIN", "VOLUNTEER"]).order("name");
    setStaff(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setSaving(false);
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setSaving(false);
    load();
  }

  return (
    <div>
      <PageHeader title="Staff Accounts" description="Create logins for admins and volunteers. Volunteers only get access to the scanner." />

      <Card className="p-4 mb-6">
        <form onSubmit={createStaff} className="grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
            <Select value={role} onChange={(e) => setRole(e.target.value as "VOLUNTEER" | "ADMIN")}>
              <option value="VOLUNTEER">Volunteer</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>
          <div className="sm:col-span-4 flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create account"}
            </Button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {staff.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-medium text-white">{s.name}</td>
                  <td className="px-4 py-2">
                    <Badge tone={s.role === "ADMIN" ? "indigo" : "default"}>{s.role}</Badge>
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

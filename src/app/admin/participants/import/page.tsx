"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Card, Button } from "@/components/ui";

interface CsvRow {
  name: string;
  contact?: string;
  team?: string;
  unique_code?: string;
}

export default function ImportParticipantsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ ok: number; failed: string[] } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const clean = res.data.filter((r) => r.name && r.name.trim());
        setRows(clean);
      },
    });
  }

  async function runImport() {
    setImporting(true);
    setProgress(0);
    const supabase = createClient();
    const failed: string[] = [];
    let ok = 0;

    // Resolve/create teams by name first, building a name -> id cache.
    const teamCache = new Map<string, string>();
    const { data: existingTeams } = await supabase.from("teams").select("id, name");
    existingTeams?.forEach((t) => teamCache.set(t.name.toLowerCase(), t.id));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        let teamId: string | null = null;
        const teamName = row.team?.trim();
        if (teamName) {
          const key = teamName.toLowerCase();
          if (teamCache.has(key)) {
            teamId = teamCache.get(key)!;
          } else {
            const { data: newTeam, error: teamError } = await supabase
              .from("teams")
              .insert({ name: teamName })
              .select("id")
              .single();
            if (teamError) throw teamError;
            teamId = newTeam.id;
            teamCache.set(key, newTeam.id);
          }
        }

        let code = row.unique_code?.trim().toUpperCase();
        if (!code) {
          const { data: generated, error: codeError } = await supabase.rpc("next_participant_code");
          if (codeError) throw codeError;
          code = generated as string;
        }

        const { error: insertError } = await supabase.from("participants").insert({
          unique_code: code,
          name: row.name.trim(),
          contact: row.contact?.trim() || null,
          team_id: teamId,
          qr_data: code,
        });
        if (insertError) throw insertError;
        ok++;
      } catch (err) {
        failed.push(`${row.name}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
      setProgress(i + 1);
    }

    setResult({ ok, failed });
    setImporting(false);
  }

  return (
    <div>
      <PageHeader
        title="Bulk import participants"
        description="CSV columns: name (required), contact, team, unique_code (all optional except name). If a team name doesn't exist yet, it's created automatically. Leave unique_code blank to auto-generate ANV-xxxx codes."
      />

      <Card className="p-4 mb-6">
        <input type="file" accept=".csv" onChange={handleFile} className="text-sm" />
        {fileName && <p className="text-xs text-slate-500 mt-2">{fileName} — {rows.length} rows parsed</p>}
      </Card>

      {rows.length > 0 && !result && (
        <Card className="overflow-hidden mb-6">
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Contact</th>
                  <th className="px-4 py-2">Team</th>
                  <th className="px-4 py-2">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2 text-slate-500">{r.contact || "—"}</td>
                    <td className="px-4 py-2 text-slate-500">{r.team || "—"}</td>
                    <td className="px-4 py-2 text-slate-500 font-mono text-xs">{r.unique_code || "auto"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 flex items-center gap-3">
            <Button onClick={runImport} disabled={importing}>
              {importing ? `Importing ${progress}/${rows.length}…` : `Import ${rows.length} participants`}
            </Button>
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-4">
          <p className="text-sm text-emerald-600 font-medium">{result.ok} imported successfully.</p>
          {result.failed.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-red-600 font-medium">{result.failed.length} failed:</p>
              <ul className="text-xs text-red-500 list-disc pl-5 mt-1">
                {result.failed.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          <Button className="mt-4" onClick={() => router.push("/admin/participants")}>
            Back to participants
          </Button>
        </Card>
      )}
    </div>
  );
}

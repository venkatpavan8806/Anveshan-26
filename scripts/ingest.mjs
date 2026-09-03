#!/usr/bin/env node
// Local file-ingestion script — run manually, never deployed to Vercel.
//
// Usage:
//   node scripts/ingest.mjs <folder>
//
// Expected folder structure (all files optional — the script skips
// anything it doesn't find):
//
//   <folder>/
//     participants.csv     columns: name, contact, team, unique_code
//                           (contact/team/unique_code optional; unique_code
//                           auto-generated as ANV-xxxx if omitted)
//     rules.md                 (or rules.txt / rules.docx)
//                           split into sections on lines starting with "## "
//     timeline.csv          columns: title, description, start_time, end_time
//                           (times parseable by `new Date(...)`, e.g. ISO or
//                           "2026-09-03 10:00")
//     schedule.csv          columns: team, title, start_time, end_time, location
//                           (team must match a team name from participants.csv,
//                           or one will be created)
//     images/*.{png,jpg,jpeg,webp,svg}
//                           uploaded to Supabase Storage under branding/,
//                           public URLs printed at the end.
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY (this bypasses RLS by design — it's an
// operator tool, not something exposed to the app).

import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";
import mammoth from "mammoth";
import { config } from "dotenv";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

config({ path: ".env.local" });

const folder = process.argv[2];
if (!folder) {
  console.error("Usage: node scripts/ingest.mjs <folder>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function fileIfExists(...candidates) {
  for (const name of candidates) {
    const p = path.join(folder, name);
    if (existsSync(p)) return p;
  }
  return null;
}

async function parseCsv(filePath) {
  const text = await readFile(filePath, "utf-8");
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
  return data;
}

async function getOrCreateTeam(cache, name) {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const { data: existing } = await supabase.from("teams").select("id").ilike("name", name.trim()).maybeSingle();
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }
  const { data: created, error } = await supabase.from("teams").insert({ name: name.trim() }).select("id").single();
  if (error) throw error;
  cache.set(key, created.id);
  return created.id;
}

async function nextCode() {
  const { data, error } = await supabase.rpc("next_participant_code_service");
  if (error) throw error;
  return data;
}

async function importParticipants() {
  const file = await fileIfExists("participants.csv");
  if (!file) return console.log("— no participants.csv, skipping");

  const rows = await parseCsv(file);
  const teamCache = new Map();
  let ok = 0;
  const failed = [];

  for (const row of rows) {
    if (!row.name?.trim()) continue;
    try {
      const teamId = await getOrCreateTeam(teamCache, row.team);
      let code = row.unique_code?.trim().toUpperCase();
      if (!code) code = await nextCode();

      const { error } = await supabase.from("participants").insert({
        unique_code: code,
        name: row.name.trim(),
        contact: row.contact?.trim() || null,
        team_id: teamId,
        qr_data: code,
      });
      if (error) throw error;
      ok++;
    } catch (err) {
      failed.push(`${row.name}: ${err.message}`);
    }
  }
  console.log(`✓ participants: ${ok} imported${failed.length ? `, ${failed.length} failed` : ""}`);
  failed.forEach((f) => console.log("  ✗", f));
}

async function importRules() {
  const file = await fileIfExists("rules.md", "rules.txt", "rules.docx");
  if (!file) return console.log("— no rules.md/.txt/.docx, skipping");

  let text;
  if (file.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ path: file });
    text = value;
  } else {
    text = await readFile(file, "utf-8");
  }

  const sections = [];
  const lines = text.split("\n");
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^##?\s+(.*)/);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[1].trim(), content: "" };
    } else if (current) {
      current.content += line + "\n";
    }
  }
  if (current) sections.push(current);
  if (sections.length === 0) sections.push({ title: "Rules", content: text });

  let order = 1;
  for (const s of sections) {
    const { error } = await supabase
      .from("rules")
      .insert({ section_title: s.title, content: s.content.trim(), order_index: order++ });
    if (error) console.log("  ✗", s.title, error.message);
  }
  console.log(`✓ rules: ${sections.length} sections imported`);
}

async function importTimeline() {
  const file = await fileIfExists("timeline.csv");
  if (!file) return console.log("— no timeline.csv, skipping");

  const rows = await parseCsv(file);
  let ok = 0;
  let order = 1;
  for (const row of rows) {
    if (!row.title?.trim() || !row.start_time) continue;
    const { error } = await supabase.from("timeline_events").insert({
      title: row.title.trim(),
      description: row.description?.trim() || null,
      start_time: new Date(row.start_time).toISOString(),
      end_time: row.end_time ? new Date(row.end_time).toISOString() : null,
      order_index: order++,
    });
    if (error) console.log("  ✗", row.title, error.message);
    else ok++;
  }
  console.log(`✓ timeline: ${ok} events imported`);
}

async function importSchedule() {
  const file = await fileIfExists("schedule.csv");
  if (!file) return console.log("— no schedule.csv, skipping");

  const rows = await parseCsv(file);
  const teamCache = new Map();
  let ok = 0;
  for (const row of rows) {
    if (!row.team?.trim() || !row.title?.trim() || !row.start_time || !row.end_time) continue;
    try {
      const teamId = await getOrCreateTeam(teamCache, row.team);
      const { error } = await supabase.from("schedule_slots").insert({
        team_id: teamId,
        title: row.title.trim(),
        start_time: new Date(row.start_time).toISOString(),
        end_time: new Date(row.end_time).toISOString(),
        location: row.location?.trim() || null,
      });
      if (error) throw error;
      ok++;
    } catch (err) {
      console.log("  ✗", row.team, err.message);
    }
  }
  console.log(`✓ schedule: ${ok} slots imported`);
}

async function importImages() {
  const imagesDir = path.join(folder, "images");
  if (!existsSync(imagesDir)) return console.log("— no images/ folder, skipping");

  const files = await readdir(imagesDir);
  const urls = [];
  for (const name of files) {
    if (!/\.(png|jpe?g|webp|svg)$/i.test(name)) continue;
    const bytes = await readFile(path.join(imagesDir, name));
    const dest = `branding/${name}`;
    const { error } = await supabase.storage.from("anveshan").upload(dest, bytes, { upsert: true });
    if (error) {
      console.log("  ✗", name, error.message);
      continue;
    }
    const { data } = supabase.storage.from("anveshan").getPublicUrl(dest);
    urls.push(data.publicUrl);
  }
  console.log(`✓ images: ${urls.length} uploaded`);
  urls.forEach((u) => console.log("  ", u));
}

async function main() {
  console.log(`Ingesting from ${folder}\n`);
  await importParticipants();
  await importRules();
  await importTimeline();
  await importSchedule();
  await importImages();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

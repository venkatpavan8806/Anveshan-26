// One-off: bulk-recolors the light slate/indigo theme to a dark
// navy/sky theme matching the Anveshan'26 poster. Single-pass regex per
// file (map-based) so no double-substitution ordering bugs.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = new URL("../src", import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, "$1");

const MAP = {
  // backgrounds
  "bg-white": "bg-slate-900",
  "bg-slate-50": "bg-slate-900",
  "bg-slate-100": "bg-slate-800",
  "bg-slate-200": "bg-slate-700",
  "bg-slate-300": "bg-slate-700",
  "hover:bg-slate-50": "hover:bg-slate-800",
  "hover:bg-slate-100": "hover:bg-slate-800",
  "hover:bg-slate-200": "hover:bg-slate-700",

  // text
  "text-slate-900": "text-white",
  "text-slate-800": "text-slate-100",
  "text-slate-700": "text-slate-300",
  "text-slate-600": "text-slate-300",
  "text-slate-500": "text-slate-400",
  "text-slate-400": "text-slate-500",
  "hover:text-slate-900": "hover:text-white",
  "hover:text-red-600": "hover:text-red-400",

  // borders
  "border-slate-100": "border-slate-800",
  "border-slate-200": "border-slate-800",
  "border-slate-300": "border-slate-700",

  // indigo -> sky accent
  "bg-indigo-600": "bg-sky-500",
  "bg-indigo-700": "bg-sky-600",
  "bg-indigo-500": "bg-sky-500",
  "bg-indigo-400": "bg-sky-400",
  "bg-indigo-100": "bg-sky-500/15",
  "bg-indigo-50": "bg-sky-500/10",
  "hover:bg-indigo-700": "hover:bg-sky-600",
  "text-indigo-600": "text-sky-400",
  "text-indigo-700": "text-sky-300",
  "border-indigo-300": "border-sky-500/40",
  "focus:ring-indigo-500": "focus:ring-sky-400",

  // emerald (success)
  "bg-emerald-100": "bg-emerald-500/15",
  "bg-emerald-50": "bg-emerald-500/10",
  "text-emerald-700": "text-emerald-300",
  "text-emerald-600": "text-emerald-400",
  "border-emerald-400": "border-emerald-500/50",

  // red (danger)
  "bg-red-100": "bg-red-500/15",
  "bg-red-50": "bg-red-500/10",
  "bg-red-700": "bg-red-600",
  "text-red-700": "text-red-300",
  "text-red-600": "text-red-400",
  "text-red-500": "text-red-400",
  "border-red-400": "border-red-500/50",
  "border-red-300": "border-red-500/40",

  // amber (warning)
  "bg-amber-100": "bg-amber-500/15",
  "text-amber-700": "text-amber-300",
  "text-amber-600": "text-amber-400",
  "text-amber-900": "text-amber-200",
};

const KEYS = Object.keys(MAP).sort((a, b) => b.length - a.length);
const PATTERN = new RegExp(`\\b(${KEYS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (/\.(tsx|ts)$/.test(e.name)) files.push(full);
  }
  return files;
}

const files = await walk(ROOT);
let changedCount = 0;

for (const file of files) {
  const content = await readFile(file, "utf-8");
  const next = content.replace(PATTERN, (m) => MAP[m] ?? m);
  if (next !== content) {
    await writeFile(file, next, "utf-8");
    changedCount++;
    console.log("✓", path.relative(ROOT, file));
  }
}

console.log(`\n${changedCount} files updated.`);

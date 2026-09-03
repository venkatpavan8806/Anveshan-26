import mammoth from "mammoth";
import { writeFile } from "node:fs/promises";

const path = process.argv[2];
const { value } = await mammoth.extractRawText({ path });

const lines = value
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.length > 0);

// Skip the header block ("ATTENDANCE SHEET", "S.No.", "Team Name", "Team Members", "Signature")
const startIdx = lines.findIndex((l) => /^1$/.test(l));
const body = lines.slice(startIdx);

const teams = [];
let current = null;

for (const line of body) {
  if (/^\d+$/.test(line)) {
    if (current) teams.push(current);
    current = { no: Number(line), name: null, members: [] };
  } else if (current && current.name === null) {
    current.name = line;
  } else if (current) {
    current.members.push(line);
  }
}
if (current) teams.push(current);

console.log(`Parsed ${teams.length} teams, ${teams.reduce((s, t) => s + t.members.length, 0)} members total.\n`);
teams.forEach((t) => {
  console.log(`${t.no}. ${t.name}  [${t.members.length}] -> ${t.members.join(" | ")}`);
});

await writeFile(new URL("./teams-parsed.json", import.meta.url), JSON.stringify(teams, null, 2));
console.log("\nWrote scripts/teams-parsed.json");

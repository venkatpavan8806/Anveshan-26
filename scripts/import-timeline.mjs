// One-off import of the Anveshan timeline (from "ANVESHAN - TIMELINE.md")
// into timeline_events. Curated down to the substantive events only —
// day headers and blank sections from the source doc are dropped.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// All times IST-naive local — adjust if your Supabase project needs a
// specific timezone offset; these are stored as-is via `new Date(...)`
// which uses the machine's local timezone at import time.
const events = [
  {
    title: "Start of Anveshan",
    description: null,
    start_time: "2026-09-07T09:00:00",
    end_time: null,
    estimated: false,
  },
  {
    title: "Lunch Break",
    description: null,
    start_time: "2026-09-07T11:45:00",
    end_time: "2026-09-07T12:30:00",
    estimated: false,
  },
  {
    title: "First Review",
    description: null,
    start_time: "2026-09-07T15:00:00",
    end_time: null,
    estimated: false,
  },
  {
    title: "Snack Break / Refreshments",
    description: null,
    start_time: "2026-09-07T16:30:00",
    end_time: "2026-09-07T17:00:00",
    estimated: false,
  },
  {
    title: "Dinner Break",
    description: null,
    start_time: "2026-09-07T19:30:00",
    end_time: "2026-09-07T21:00:00",
    estimated: false,
  },
  {
    title: "Second Review (Code Evaluation)",
    description: null,
    start_time: "2026-09-07T23:00:00",
    end_time: null,
    estimated: false,
  },
  {
    title: "Fun Activity (optional)",
    description: "Estimated time — source doc only said 'after 2nd review', no exact time given.",
    start_time: "2026-09-08T00:30:00",
    end_time: null,
    estimated: true,
  },
  {
    title: "Final Review",
    description: "All teams reviewed and winners announced. Estimated time — source doc gave no exact time.",
    start_time: "2026-09-08T10:00:00",
    end_time: null,
    estimated: true,
  },
  {
    title: "Goodies & Prize Distribution",
    description: "Estimated time — source doc gave no exact time.",
    start_time: "2026-09-08T11:30:00",
    end_time: null,
    estimated: true,
  },
  {
    title: "End of Anveshan",
    description: "Estimated time — source doc gave no exact time.",
    start_time: "2026-09-08T12:00:00",
    end_time: null,
    estimated: true,
  },
];

let order = 1;
for (const ev of events) {
  const { error } = await supabase.from("timeline_events").insert({
    title: ev.title,
    description: ev.description,
    start_time: new Date(ev.start_time).toISOString(),
    end_time: ev.end_time ? new Date(ev.end_time).toISOString() : null,
    order_index: order++,
  });
  if (error) {
    console.log(`✗ ${ev.title}: ${error.message}`);
  } else {
    console.log(`✓ ${ev.title}${ev.estimated ? "  (ESTIMATED TIME)" : ""}`);
  }
}

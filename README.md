# Anveshan

Hackathon participant & operations portal — movement tracking (admin/volunteer)
+ participant portal (timeline, rules, schedule, notifications, mini-games).

## Stack

Next.js (App Router) · Supabase (Postgres + Auth + Storage) · Tailwind CSS ·
`qrcode` + `html5-qrcode` · Web Push (`web-push` + VAPID)

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New project. Pick any name/region, save the database password somewhere.
2. Once it's provisioned, go to **Project Settings → API**. You need three values:
   - **Project URL**
   - **anon / public key**
   - **service_role key** (click "Reveal" — keep this secret, never ship it to the browser)
3. Copy `.env.local.example` to `.env.local` and fill in those three values, plus a `CRON_SECRET` (any random string — see step 5) and the VAPID keys (step 4).

```bash
cp .env.local.example .env.local
```

## 2. Run the database schema

Open **Supabase Dashboard → SQL Editor → New query**, paste the entire contents of
[`supabase/schema.sql`](supabase/schema.sql), and run it. It's idempotent — safe to re-run if you change something.

**What it sets up, and why:**

- **Tables** for everything in the spec, plus two small additions the app needs:
  `notification_reads` (per-participant read/unread state for the bell icon) and
  `quiz_questions` (so trivia questions are admin-editable instead of hardcoded).
- **`profiles.role`** drives everything. A trigger (`handle_new_user`) auto-creates
  a `profiles` row whenever someone signs up in `auth.users`, reading the role from
  their signup metadata (defaults to `PARTICIPANT` if none is given — that's how
  self-service participant signup works, see step 6).
- **Row Level Security (RLS)** is enabled on every table. The core guarantees:
  - **`movement_logs` has no policy granting participants access at all** — not
    "hidden in the UI", actually unreadable at the database level for anyone whose
    role isn't ADMIN/VOLUNTEER. Same for other participants' rows in `participants`
    (a participant can only `select` their *own* row).
  - Admins get a blanket `USING (is_admin())` policy on the tables they manage
    (teams, schedule, rules, timeline, notifications, quiz questions) — so the
    admin UI can read/write directly with the anon key + the admin's session,
    no service-role key needed for normal admin actions.
  - `is_admin()`, `is_staff()`, `my_participant_id()`, `my_team_id()` are small
    `SECURITY DEFINER` helper functions. They exist so policies can check "is this
    user an admin" *without* querying `profiles` through RLS again (which would
    either recurse or need its own permissive policy) — a standard Supabase pattern.
  - **`toggle_participant_status()`** is how the scanner works: instead of granting
    volunteers a raw `UPDATE` on `participants`, they call this one RPC, which
    flips status *and* inserts the matching `movement_logs` row *atomically*, tagged
    with their own `auth.uid()` as `scanned_by`. Volunteers never get direct write
    access to either table.
- **`v_currently_out`** is a view (with `security_invoker = true`, so it still
  respects the querying user's RLS) that the admin dashboard uses to show who's
  outside right now, with their last check-out time.
- A **Storage bucket** called `anveshan` (public read, staff-only write) for
  participant photos and any logos/branding you upload.
- Both tables the admin dashboard needs live updates from
  (`participants`, `movement_logs`) — plus `notifications` for the bell —
  are added to the `supabase_realtime` publication.

Optionally also run [`supabase/seed.sql`](supabase/seed.sql) for a couple of sample
teams/rules/timeline events/quiz questions, so you have something to look at
before your real event data is ready.

## 3. Create your first admin account

```bash
npm install
node scripts/create-admin.mjs you@example.com "a-strong-password" "Your Name"
```

Sign in at `/login` with that email/password — you'll land on `/admin`. From there,
use **Staff Accounts** to create volunteer (and more admin) logins for the rest of
your team; they don't need the CLI.

Participants activate their *own* accounts later, using the unique code printed on
their badge — see `/activate`. That only works once they exist as a `participants`
row (via CSV import or manual registration in the admin UI), because activation
looks up and claims that row.

## 4. Generate VAPID keys (for push notifications)

VAPID keys let your server prove to browsers that push messages really come from
your app. Generate a pair once, they don't expire:

```bash
npx web-push generate-vapid-keys
```

Put the output into `.env.local`:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<the Public Key it printed>
VAPID_PRIVATE_KEY=<the Private Key it printed>
VAPID_SUBJECT=mailto:you@example.com
```

The public key ships to the browser (it's fine, it's public); the private key
signs push payloads server-side in [`src/lib/push-server.ts`](src/lib/push-server.ts)
and must never be exposed client-side. When a participant logs in,
[`PushRegister`](src/components/push-register.tsx) asks for notification
permission, subscribes via the service worker (`public/sw.js`), and stores the
subscription in `push_subscriptions` (RLS: a participant can only insert/read/delete
their *own* subscription rows).

## 5. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`. You'll be redirected to `/login`.

To test the full loop locally:
1. Sign in as admin → **Participants → + Add participant** (or **Bulk import CSV**).
2. Open that participant's detail page → **Download badge PDF** to get their QR code.
3. Create a volunteer account (**Staff Accounts**), sign in as them in a private/incognito
   window → **Scanner**, allow camera access, scan the badge (or point it at the QR
   code on your screen/phone from the badge PDF).
4. Back in the admin dashboard, watch the "Currently Outside" list update in real time.
5. Have the participant activate their account at `/activate` using their badge code,
   then explore the participant side (Timeline, Rules, My Schedule, Notifications, Arcade).

Note: camera access requires either `localhost` (fine) or HTTPS — this matters
once you deploy, but not for local dev.

## 6. Ingest your real event files (when ready)

Put your files in a local folder — nothing here gets committed or deployed, this
is a one-off local script. Expected structure ([full details in the script's
header comment](scripts/ingest.mjs)):

```
your-folder/
  participants.csv    # name, contact, team, unique_code (only name required)
  rules.md            # sections split on "## Heading" lines (or rules.txt / rules.docx)
  timeline.csv         # title, description, start_time, end_time
  schedule.csv          # team, title, start_time, end_time, location
  images/               # logos/branding — uploaded to Supabase Storage
```

Run it:

```bash
node scripts/ingest.mjs "/path/to/your-folder"
```

It's additive (re-running re-imports/duplicates rows), so review the console
output — if something looks wrong, fix the source file and re-run, or clean up
duplicates from the admin UI.

## 7. Auto-notifications for the schedule (GitHub Actions cron)

[`src/app/api/cron/notify/route.ts`](src/app/api/cron/notify/route.ts) checks
`schedule_slots` and fires two auto-notifications per slot, each gated by the
slot's own status so it only ever fires once:

- `UPCOMING → READY_CALL`: when a slot starts within 15 minutes, notify that team
  ("get ready") and flip its status.
- `READY_CALL → IN_PROGRESS`: once the start time has passed, notify again
  ("you're up") and flip its status.

**Why GitHub Actions and not Vercel Cron:** Vercel's free Hobby plan only allows
cron jobs to run once a day, which is useless for same-day alerts — every-5-minutes
schedules need a paid Pro plan. [`.github/workflows/notify-cron.yml`](.github/workflows/notify-cron.yml)
does the same job for free by pinging the endpoint every 5 minutes from GitHub's
own scheduler (`vercel.json` intentionally has no `crons` key, so Vercel won't
complain during deploy).

One-time setup — in this repo on GitHub, go to **Settings → Secrets and variables
→ Actions** and add two repository secrets:

- `APP_URL` — your deployed URL, e.g. `https://your-app.vercel.app` (no trailing slash)
- `CRON_SECRET` — the same value as `CRON_SECRET` in your `.env.local` / Vercel env vars

That's it — the workflow starts running automatically once those secrets exist
(GitHub only runs scheduled workflows on the repo's default branch). You can also
trigger it manually from the **Actions** tab (**Anveshan schedule notifications** →
**Run workflow**) to test it immediately rather than waiting up to 5 minutes.

The endpoint itself is protected by that same shared secret regardless of what
calls it — it checks `Authorization: Bearer <CRON_SECRET>`, so nobody else can
trigger notification spam even if they find the URL.

Admins can also always trigger a notification manually (no cron needed) from
**Admin → Notifications**.

## 8. Deploy to Vercel

1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. Add every variable from `.env.local` under **Settings → Environment Variables**
   (all of them — `NEXT_PUBLIC_*` ones are needed at build time too).
4. Deploy.
5. In Supabase → **Authentication → URL Configuration**, add your Vercel URL
   (`https://your-app.vercel.app`) to **Site URL** and **Redirect URLs**, so
   auth redirects work in production.
6. Re-test the full loop (register → badge → scan → dashboard → participant
   login → notifications → arcade) against the live URL. Camera scanning needs
   HTTPS, which Vercel gives you automatically.

## Project structure

```
src/
  app/
    login/, activate/                    auth entry points
    admin/                                admin-only (participants, teams, badges,
                                           movement log, schedule, rules, timeline,
                                           notifications, arcade, staff accounts)
    volunteer/scan/                       QR scanner (volunteer + admin)
    participant/                          timeline, rules, my schedule,
                                           notifications, arcade (4 mini-games)
    api/                                  activate, admin/staff, notifications/send,
                                           cron/notify — anything needing the
                                           service-role key or server-only secrets
  components/                             shared UI + app shell
  lib/                                    supabase clients, badge/QR/PDF gen,
                                           push (client+server), notify helper
  types/database.ts                       hand-written types matching schema.sql
supabase/
  schema.sql                              full schema + RLS (run this first)
  seed.sql                                optional sample data
scripts/
  create-admin.mjs                        bootstrap your first admin
  ingest.mjs                               local CSV/docs/images importer
public/sw.js                              push notification service worker
```

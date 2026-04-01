# Capoeira SMIQ Funnel

An Ask Method–style audience research funnel for Capoeira, built as two standalone HTML files. Respondents self-select into a segment, answer a single open-text question tailored to where they are in their journey, and submit their name and email. A separate dashboard then loads those responses and runs AI-powered theme analysis via the Anthropic API.

---

## Files

| File | Purpose |
|---|---|
| `capoeira-form.html` | Public-facing lead capture form |
| `capoeira-dashboard.html` | Private analysis dashboard (owner only) |

Both files are self-contained — no build step, no framework, no dependencies beyond Google Fonts.

---

## How It Works

### Form (`capoeira-form.html`)

Respondents move through a short multi-step flow:

**Step 1 — Segment picker**
Five cards displayed in a 2×2 grid with a full-width fifth card:

| Segment | Key | Description |
|---|---|---|
| 🌱 The Curious One | `curious` | New or exploring, not yet training regularly |
| 🎵 The Student | `student` | Training consistently, learning jogo and music |
| 🌀 The Practitioner | `practitioner` | Years of training, playing rodas |
| 🪘 The Teacher | `teacher` | Mestre, instructor, or running a group/school |
| 🌙 The One Who Left | `lapsed` | Trained before but stepped away |

**Step 2 — SMIQ (Single Most Important Question)**
Each segment sees a different question and placeholder, personalised to their context.

**Step 3 — Teacher detail (Teacher segment only)**
Teachers answer two additional grids: their teaching situation (4 options) and their graduation level (6 options). Both must be selected to continue. All other segments skip this step entirely.

**Step 4 — Name and email capture**
Email is validated before the submit button enables. On success, a thank-you screen is shown with a segment badge.

### Dashboard (`capoeira-dashboard.html`)

A private tool for the form owner. Enter your Supabase credentials, load responses, then optionally run AI analysis.

**Load Data** fetches responses from Supabase with optional limit (100 / 250 / 500 / 1000 / All) and segment filter. A stats bar shows totals per segment.

**Run AI Analysis** sends up to 150 answers per segment to `claude-sonnet-4-20250514` and returns 3–5 pain point themes per segment, each with a name, estimated percentage, insight sentence, and example quote — plus a cross-segment strategic summary.

---

## Supabase Setup

### 1. Create the table

In your Supabase project, run this in the SQL editor:

```sql
create table smiq_responses (
  id            bigint generated always as identity primary key,
  created_at    timestamptz default now(),
  name          text,
  email         text,
  segment       text,
  segment_label text,
  smiq_answer   text,
  teaching_role    text,
  graduation_level text
);
```

### 2. Enable Row Level Security and add an insert policy

RLS is enabled by default on new tables. Add a policy to allow anonymous inserts:

```sql
create policy "anon_insert"
on "public"."smiq_responses"
as PERMISSIVE
for INSERT
to anon
with check (
  true
);
```

Or via the dashboard: **Table Editor → smiq_responses → RLS Policies → New Policy → INSERT → target role: anon → WITH CHECK: `true`**.

### 3. Add your credentials to the form

Open `capoeira-form.html` and edit the config block near the bottom of the file:

```js
const SUPABASE_URL      = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
const TABLE             = 'smiq_responses';
```

Your project URL and anon key are in **Supabase → Project Settings → API**.

---

## Dashboard Setup

The dashboard takes credentials at runtime via its config panel — no hardcoding needed. Open `capoeira-dashboard.html` in a browser, paste in your Supabase URL and anon key, and click **Load Data**.

To run AI analysis you also need an **Anthropic API key**. The dashboard calls `https://api.anthropic.com/v1/messages` directly from the browser. Because this exposes your key in the network tab, keep the dashboard file private (do not publish it publicly).

The dashboard uses model `claude-sonnet-4-20250514`.

---

## Data Captured

Every submission stores:

| Field | Example |
|---|---|
| `name` | Maria |
| `email` | maria@example.com |
| `segment` | `practitioner` |
| `segment_label` | The Practitioner |
| `smiq_answer` | Full open-text response |
| `teaching_role` | `own-school` (teachers only, else null) |
| `graduation_level` | `contra-mestre` (teachers only, else null) |
| `created_at` | ISO 8601 timestamp |

### Teaching role values

| Value | Meaning |
|---|---|
| `classes` | Teaches at someone else's school |
| `own-school` | Teaches and runs their own school |
| `admin` | Runs a school but doesn't teach regularly |
| `online` | Teaches primarily online |

### Graduation level values

`monitor` · `professor` · `contra-mestre` · `mestre` · `grao-mestre` · `ungraded`

---

## Customisation

**Changing questions** — Edit the `SEGMENTS` object in `capoeira-form.html`. Each segment has a `smiq` (question text) and `placeholder` (example answer).

**Adding a segment** — Add an entry to `SEGMENTS`, add a card to the `#segment-grid` HTML, and add a CSS variable if you want a distinct accent colour. The routing logic handles non-teacher segments automatically.

**Changing the table name** — Update the `TABLE` constant in the form's config block.

---

## Technical Notes

- No frameworks, no build step — open either file directly in a browser
- All button interactions use `addEventListener` — no inline `onclick` attributes
- Step animations use a forced reflow (`void card.offsetWidth`) to restart the `fadeUp` keyframe on every step transition
- The teacher detail step (index 2) is skipped in both `goNext()` and `goBack()` for all non-teacher segments
- The dashboard displays a maximum of 200 rows in the raw data table; the AI analysis uses up to 150 answers per segment regardless of how many were loaded
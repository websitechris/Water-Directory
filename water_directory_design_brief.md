# 💧 UK Water Quality Directory — Full Design Brief

**Prepared:** March 2026  
**For:** Chris Pennington  
**Based on:** Gemini Deep Research + Project Architecture

---

## 1. What This Site Actually Is

A trusted, independent, data-driven tool that tells any UK resident exactly what is in their tap water — and what to do about it.

It is **not** a blog. It is **not** a generic health site. It is the site you wish existed when you moved house, had a baby, or read another story about sewage in the news.

The closest design comparisons are:
- **GOV.UK** — austere, trusted, data-led
- **ClearScore** — clean fintech dashboard with plain-English scoring
- **Flood Map for Planning** — serious environmental tool, not pretty but deeply trusted

Avoid at all costs: stock photos of water droplets, blue gradient hero sections, AI-generated "wellness" copy.

---

## 2. Brand Identity

**Site name:** Water Directory (or consider: TapCheck, WaterCheck, MyTapWater — worth a decision)

**Tone of voice:**
- Factual, not alarmist
- Plain English — no jargon
- Like a trusted doctor giving you your test results: honest, clear, actionable
- Never preachy or campaigning

**Colour palette:**
- Primary: Deep navy `#0f2942` — authority, water depth
- Accent: Clean teal `#0891b2` — water, clarity
- Warning: Amber `#d97706` — caution without panic
- Danger: Muted red `#dc2626` — only for genuine exceedances
- Background: Off-white `#f8fafc` — not stark white, easier to read
- Text: Near-black `#1e293b`

**Typography:**
- Headlines: Inter or DM Sans — modern, clean, not corporate
- Body: System font stack — fast loading, feels native
- Data figures: Tabular numerals, slightly larger, bold

**Logo concept:**
- Simple wordmark + a minimal water drop or test tube icon
- No clip art. No cartoon drops.

---

## 3. Site Structure — 6 Pages

### Page 1: Homepage (the tool)

**Above the fold — nothing but the search:**
- Large, confident headline: "What's actually in your tap water?"
- Single postcode input, large, prominent Search button
- Subline: "Real 2024 lab data for every UK postcode"
- No hero image. Clean white/off-white background.

**Below the fold — social proof and context:**
- 3 stat blocks: "13 water companies covered", "90,000+ zones mapped", "Real DWI lab data"
- A single sentence on data provenance: "Data sourced from the Drinking Water Inspectorate via the Stream open data initiative"
- 3 audience entry points (linked to hub pages):
  - "New baby at home?" → Parents hub
  - "Dry skin or eczema?" → Skin & health hub  
  - "Just bought a house?" → Homebuyers hub
- Recent blog posts (3 cards, auto-populated)

---

### Page 2: Results Page (the scorecard)

This is the most important page. Every design decision should serve clarity.

**Header:**
- "Water Quality Report for [Town/District]"
- Supplier name + small supplier logo if available
- "Data period: 2024 | Source: DWI / Stream API"

**Scorecard section — 5 key metrics displayed as gauge cards:**

Each card shows:
- Chemical name (plain English — "Nitrates", not "NO3")
- The actual reading (big, bold number)
- Unit (mg/L etc)
- A visual bar: green → amber → red with a marker showing where the reading sits
- The legal limit shown on the bar
- A one-line plain English verdict: "Well within safe limits" / "Approaching legal limit — consider filtering"

The 5 cards:
1. Nitrates (limit 50mg/L — flag concern above 30 for babies)
2. Chlorine (limit 0.5mg/L — taste/odour issue above 0.3)
3. Fluoride (limit 1.5mg/L — note if fluoridated)
4. Lead (limit 10µg/L — flag pre-1970 homes)
5. Water Hardness (no legal limit — soft/medium/hard/very hard)

**Sewage Spills section:**
- "Sewage Spills Near You" — map or list of nearest CSO events
- Nearest spill location, distance, hours discharged in 2024
- Plain English note: "This is river/coastal data, not your tap water — but here's what it means"
- Source: Rivers Trust / Environment Agency EDM data

**Lead Pipe Risk section:**
- If home age selected as pre-1970: amber warning card
- "Older properties may have lead supply pipes. Your reading above reflects zone averages — your actual tap may differ."
- Link to DWI lead pipe guidance

**Call to action — triggered by data:**
- Hardness > 200 mg/L → "Your area has very hard water. Get a free quote for a water softener" (lead gen)
- Any concern flag → "See recommended filters for your water profile" (affiliate)
- All clear → "Your water is fine — but see what your neighbours are checking"

---

### Page 3: Parents & Babies Hub

**URL:** /water-quality-for-babies

**Purpose:** Capture the highest-intent, highest-anxiety audience. Convert to filter affiliate sales.

**Key articles to write (one at a time, when you feel like it):**
- "Nitrates in tap water and babies: what UK parents need to know"
- "Is boiled tap water safe for infant formula? The science explained"
- "Lead pipes in older homes: how to protect your baby"
- "Hard water and baby eczema: is there a link?"

**Design:** Slightly warmer tone here. Still data-led but acknowledges parental anxiety without exploiting it.

**CTA:** "Check your postcode" — always prominent at top and bottom of every article.

---

### Page 4: Skin & Health Hub

**URL:** /hard-water-skin-health

**Purpose:** Capture eczema/psoriasis sufferers and hard water complainers. Convert to water softener leads (highest value).

**Key articles:**
- "Hard water and eczema: the UK Biobank evidence"
- "Which UK areas have the hardest water? Full postcode data"
- "Water softeners vs filters: which is right for your condition?"
- "The soap scum problem: why hard water wrecks your skin barrier"

**Design:** Clinical credibility. Cite studies. Link to NHS/NICE where relevant.

**CTA:** Hardness gauge prominently shown. "Book a free water softener demo" if hardness high.

---

### Page 5: Homebuyers Hub

**URL:** /water-quality-home-buying

**Purpose:** Capture property search traffic. Position as essential pre-purchase check.

**Key articles:**
- "What your CON29DW search doesn't tell you about water quality"
- "Buying a rural property with a private well: what you must check"
- "Hard water areas UK: how it affects your boiler, appliances and bills"
- "Lead pipes in UK homes: what buyers need to know"

**Design:** Professional, slightly more formal. Conveyancer-friendly language.

**CTA:** "Check any postcode before you buy" — tool link always visible.

---

### Page 6: About / Data Sources

**URL:** /about

**Purpose:** Build trust. Explain exactly where data comes from. Crucial for credibility.

**Content:**
- What this site is and isn't (independent, not affiliated with water companies)
- Exactly where every data point comes from:
  - Chemical readings: DWI via Stream API (streamwaterdata.co.uk)
  - NI data: Open Data NI
  - Sewage spills: Environment Agency EDM / Rivers Trust
  - Postcode lookup: postcodes.io
- Data freshness — when last updated
- Who built it and why (brief, honest, human)
- Contact / press enquiries email

---

## 4. Blog Strategy (No Calendar — Just Topics)

Write when you have something genuinely useful to say, or when news breaks.

**Write immediately after these events:**
- DWI annual report published (every July) — "Here's what it means for your area"
- Environment Agency EDM data release — "Worst sewage spill areas in 2024"
- Any major water contamination news (Brixham-style) — "What happened and is your area affected?"
- Hosepipe ban announcements — "What a drought means for water quality"

**Evergreen articles worth writing eventually:**
- "Which UK water company has the worst tap water?"
- "The complete guide to UK water hardness by postcode"
- "PFAS forever chemicals in UK water: what we know"
- "Why does my tap water taste of chlorine — and is it safe?"

**Format rules:**
- Always include the postcode tool as a CTA
- Always cite data sources
- Never more than 1,200 words unless the topic genuinely requires it
- One article is better than ten half-finished ones

---

## 5. SEO Quick Wins

Based on the Gemini research, these are the highest opportunity pages to rank for:

| Target keyword | Page | Why it wins |
|---|---|---|
| "water quality [city name]" | Results page | Programmatic — auto-generated for every area |
| "hard water eczema UK" | Skin hub | Low competition, high intent |
| "is my tap water safe" | Homepage | High volume, weak competition |
| "water quality buying a house UK" | Homebuyers hub | Commercial intent, zero specialist competitors |
| "tap water nitrates baby UK" | Parents hub | Anxiety-driven, no good resources exist |
| "sewage spills near me UK" | Results page | Viral, news-driven, high sharing |
| "[water company] water quality 2024" | Supplier pages (future) | Company-specific searches spike after scandals |

**One structural SEO thing to do immediately in Cursor:**
Add proper `<title>` tags and meta descriptions to every page. Currently they are probably generic Next.js defaults. Each results page should have a dynamic title like "Tap Water Quality in Worthing, West Sussex — 2024 Lab Data".

---

## 6. Monetisation — In Order of Ease

**Do first (this week):**
- Sign up to Waterdrop affiliate programme (via their website — high commissions, good products)
- Sign up to Brita via Awin affiliate network (awin.com)
- Add filter recommendation cards to the results page, triggered by chlorine/lead/nitrate flags

**Do second (next month):**
- Contact Harvey Water Softeners about a lead generation partnership
- Build the hardness-triggered CTA on the results page
- Consider a simple contact form: "Get a free water softener quote for [postcode]"

**Do later:**
- Google AdSense — easy to add but keep it tasteful, sidebar only
- PropTech API conversations — Rightmove, Zoopla, Groundsure

---

## 7. What to Build Next in Cursor

Priority order for the actual development work:

1. **Fix meta titles/descriptions** — every page needs proper SEO tags (30 min job)
2. **Add visual gauges** to the scorecard — the bar/gauge showing where readings sit vs legal limits (most impactful UI change)
3. **Add hardness to the scorecard** — it's currently missing and it's the highest monetisation trigger
4. **Individual supplier pages** — /supplier/southern-water, /supplier/thames-water etc. Good for SEO.
5. **Sewage spills integration** — Rivers Trust API or Environment Agency EDM data
6. **Blog structure** — simple Next.js blog with markdown files, no CMS needed to start
7. **Fix Thames Water** — get the LSOA CSV from streamwaterdata.co.uk

---

## 8. What This Site Should Feel Like

Imagine a user who has just read a news story about sewage in the River Thames, or whose baby has had an upset stomach, or who is about to exchange contracts on a house in a new area.

They are anxious. They want facts. They do not want to be sold to before they have their answer.

The site gives them the answer first, immediately, without a signup wall or a cookie banner that takes up half the screen. Then — and only then — it offers them something relevant to do about it.

That is the entire brief.

---

*Built on: Next.js + Supabase + Vercel | Data: DWI / Stream API / Open Data NI*

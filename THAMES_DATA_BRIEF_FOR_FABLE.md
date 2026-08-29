# Thames Water postcode-to-zone mapping — briefing

**For:** a fresh Fable 5 session (or any capable agent) picking this up cold.
**Written:** 17 Aug 2026
**Goal:** find a way to map UK postcodes → Thames Water supply zones, using
legitimate public sources. This is the one missing piece stopping ~15 million
people from seeing real lab data on waterdirectory.co.uk.

---

## The one-paragraph situation

waterdirectory.co.uk lets people look up tap water quality by postcode. For most
of England it works: `postcode → postcodes.io → LSOA code → Supabase zone →
chemical readings`. **Thames Water is the exception.** We have all of Thames's
chemical data (119 zones, full chemistry). What we do NOT have is which postcode
belongs to which Thames zone — so every Thames postcode falls back to regional
averages instead of its real local readings.

## What we already have (do not redo this — it worked)

Obtained legitimately from Thames Water's own PUBLIC endpoints:

- `thames_pdfs/` — 119 zone water-quality PDFs
- `thames_zones.csv` — 119 zones with hardness, nitrate, lead, fluoride, chlorine,
  keyed by zone code (`NLW7`, `SLW22`, `OX30`, `R31`, `Z0001`…)
- Script that did it: `scrape_thames_zones.py` — walks zone codes against:
  - `https://water-quality-api.prod.p.webapp.thameswater.co.uk/water-quality-api/Zone/{code}`
  - `https://www.thameswater.co.uk/globalassets/.../think-digital-documents.../{code}.pdf`

Both are public, unauthenticated, and returned data cleanly. **The chemistry is
solved.**

## The exact gap

The chemical readings are keyed by **zone code**. Our site looks them up by
**LSOA code** (from postcodes.io). Thames zone codes are not LSOA codes, so they
never match. We need a lookup table:

```
postcode (or LSOA)  →  Thames zone code
SW1A 1AA            →  NLW33
RG1 8DB            →  R31
...
```

`thames_master_list.csv` has this for exactly **5 postcodes** — a proof of
concept that stalled. `thames_postcode_map.csv` is empty (the run that was meant
to fill it failed).

## Why it stalled

The consumer-facing "check your postcode" tool on thameswater.co.uk — the thing
that returns the zone for a given postcode — is protected by **Cloudflare
Turnstile**. The automated attempt to drive that front-end tool was blocked.

## What to try — legitimate routes only

**Do NOT attempt to defeat, bypass, or automate around the Turnstile / bot
protection.** It is against the point of this project (see the transparency story
angle in `BLOG_IDEAS.md` — hard to criticise their opacity while scraping around
their controls) and it is brittle. Focus on these instead:

### Route 1 — find the API behind the postcode box (most promising)
The postcode lookup widget must call some backend endpoint to resolve a postcode
to a zone. The chemistry API above was public and ungated. Investigate whether a
sibling endpoint exists that takes a postcode and returns a zone, e.g. something
like `.../water-quality-api/Postcode/{pc}` or `.../Zone?postcode={pc}`. Open the
public tool in a normal browser, watch the network tab, see what it calls. If
that endpoint is itself ungated (only the widget is Turnstile-wrapped), it is the
same class of public API we already used legitimately. If it IS gated, stop —
that is the wall, and the answer is Route 3.

### Route 2 — build the mapping from open GIS data
Water supply zone boundaries sometimes exist as open data. Check:
- DWI / data.gov.uk for Thames Water supply zone boundary shapefiles
- Whether the 119 zone PDFs themselves name the areas/districts they cover
  (they have human-readable names like "Parliament", "Reading Central",
  "Willesden") — those names can be geocoded to approximate areas
- ONS postcode centroid data (free) — overlay postcodes on any zone boundary
  polygons to assign each postcode to a zone

Even an approximate mapping beats regional averages, as long as the page keeps
labelling it honestly (the site already distinguishes "local samples" from
"regional/modelled").

### Route 3 — the definitive answer: EIR request (do this regardless)
Under the Environmental Information Regulations 2004, Thames Water must provide
environmental data. The postcode-to-zone mapping is environmental data. Chris is
sending an EIR request to `eir.requests@thameswater.co.uk` for exactly this. If
they provide it, the whole problem disappears. If they refuse citing Regulation
12(5)(a) national security, that refusal is itself the story (see
`NEWS_SOURCES.md`). Routes 1–2 are worth trying in parallel because the EIR can
take weeks.

## Deliverable

A CSV: `thames_postcode_zone_map.csv` with columns `postcode,zone_code` (or
`lsoa,zone_code`), covering as much of the Thames region as possible. That plugs
straight into the existing Supabase `water_zones` lookup and lights up real data
for London, Oxford, Reading and Swindon.

## Ground rules
- Public, unauthenticated endpoints and open data only.
- Respect robots.txt and rate limits. The existing script used a 0.5s delay —
  keep that or slower.
- No circumvention of access controls, logins, or bot protection.
- If a route requires defeating a security measure, it is the wrong route —
  fall back to the EIR.

---

## OUTCOME — routes investigated to conclusion (17 Aug 2026)

Both technical routes were worked to a definitive dead end. **The EIR is now the
only route.**

### Route 1 — API behind the postcode box: WALL CONFIRMED
The real endpoint exists and is the right one:
```
https://water-quality-api.prod.p.webapp.thameswater.co.uk/water-quality-api/PostCode/{POSTCODE}/waterquality
```
It correctly returned zone `Z0058` ("Parliament") for SW1A 1AA. But it is gated:
a Cloudflare Turnstile token is required, and calling it without one returns
**412 Precondition Failed**, even with legitimate Origin/Referer headers. That is
the wall. Getting past it means solving Turnstile, which is off-limits — stopped
here.

Note for the record: the chemistry endpoint (`/Zone/{code}`) is **still ungated**
and works fine. Only the postcode→zone join is protected. Thames serves that join
to the public through their website widget, but blocks it to automated/direct
access. That asymmetry is a genuine transparency point and is now cited in the
EIR letter.

### Route 2 — open GIS: NOT AVAILABLE AT THE RIGHT GRANULARITY
Stream (streamwaterdata.co.uk) and data.gov.uk publish only **appointed-area**
boundaries — one polygon for the whole Thames region. The ~119 internal DWI
supply zones (NLW7, R31, Z0058…) are not published as boundary polygons anywhere
public. Checked Stream's catalogue, data.gov.uk and the surfacing ArcGIS items.
Nothing at sub-zone level, so there is nothing to overlay postcodes onto.

### Route 3 — EIR: the answer
See `THAMES_EIR_REQUEST.md` (ready to send). Two verified leverage points now
folded into that letter:
- Thames already serves the postcode→zone lookup to the public via their website,
  undercutting any 12(5)(a) security refusal.
- A materially similar 2016 EIR request (WhatDoTheyKnow: "Thames Water supply
  areas - GIS compatible file") was acknowledged, promised, and never fulfilled
  on the public record. Note: that 2016 request was for the broader appointed-area
  boundary, not the internal zones — related, not identical. Framed accurately in
  the letter.

### DIY fallback considered and rejected
Geocoding the 119 human-readable zone names to approximate areas: low accuracy
exactly where Thames is densest (London zones are sub-borough), and it would
undermine the honest "local samples vs modelled" labelling the site already uses.
Not worth it over waiting for the EIR.

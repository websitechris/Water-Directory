# Water Directory — GSC Action Plan

**Data:** Google Search Console, 2 Jul – 30 Jul 2026 (Performance + Coverage exports)
**Written:** 31 Jul 2026

> **STATUS — items 1–5 are implemented and uncommitted in the working tree.**
> Typecheck and ESLint pass clean. `npm run build` still needs running locally
> (the sandbox has no registry access to fetch the SWC binary). See §10.

---

## 1. Snapshot

| Metric | Value |
|---|---|
| Clicks | 14 |
| Impressions | 2,115 |
| CTR | 0.66% |
| Avg position (mobile) | 7.67 |
| Avg position (desktop) | 13.64 |
| **Pages indexed** | **13** |
| Pages not indexed | 72 |

Impressions grew from ~20/day (early May) to ~85/day (late July). **Roughly 4x in three months.** The trajectory is real and it is working. Everything below is about removing the things capping it.

Mobile is 70% of impressions (1,478 of 2,115) and ranks 6 positions better than desktop. Mobile is the site.

---

## 2. The ceiling is indexing, not content

This is the single most important number in the export:

| Coverage reason | Pages | Validation |
|---|---|---|
| Discovered – currently not indexed | 52 | Not started |
| Redirect error | 9 | Started |
| Page with redirect | 8 | Not started |
| Crawled – currently not indexed | 3 | Not started |
| Duplicate without user-selected canonical | 0 | **Passed** |

**13 pages are carrying the entire site.** 52 URLs are "Discovered – currently not indexed" — Google knows they exist and is choosing not to spend crawl budget on them. That is a site-level quality/authority signal, not 52 separate page problems.

Writing new pages before fixing this puts them at the back of the same queue.

**Good news:** "Duplicate without user-selected canonical" is 0 and Passed. The duplicate-URL problem below has not yet caused damage — because the stubs were never indexed in the first place.

### The duplicate stubs (fix while you're in there)

Three "Coming soon" placeholder pages sit at root, duplicating real content under `/blog/`, and **all three are in `app/sitemap.ts` at priority 0.8**:

| Stub (empty, in sitemap @ 0.8) | Real page | Words |
|---|---|---|
| `/water-quality-home-buying` | `/blog/water-quality-home-buying` | 331 |
| `/hard-water-skin-health` | `/blog/hard-water-eczema-uk` | 257 |
| `/water-quality-for-babies` | `/blog/tap-water-nitrates-baby-uk` | 343 |

**Action:** delete the three stub directories, 301 them to the `/blog/` equivalents, remove from `app/sitemap.ts`. You are currently spending crawl budget telling Google that three empty pages are among your most important.

---

## 3. Two pages are the whole site

| Page | Impressions | Clicks | CTR | Position |
|---|---|---|---|---|
| `/water-quality/milton-keynes` | 678 | 6 | 0.88% | 10.25 |
| `/water-quality/newcastle` | 1,047 | 5 | 0.48% | 9.06 |
| `/water-quality/manchester` | 109 | 1 | 0.92% | 8.60 |
| `/suppliers` | 78 | 1 | 1.28% | 11.08 |
| `/water-quality/london` | 64 | 0 | 0% | 9.77 |
| `/supplier/essex-suffolk-water` | 64 | 0 | 0% | 9.98 |
| `/water-quality/birmingham` | 29 | 0 | 0% | 5.31 |

Newcastle + Milton Keynes = **1,725 of 2,115 impressions (81.6%)**.

Anything that improves the town page template improves 82% of the site's surface area at once. This is the highest-leverage file in the repo:

```
app/water-quality/[slug]/page.tsx
```

---

## 4. The CTR problem — and the fix you already have

At average position 7.7 on mobile, expected CTR is roughly 2–3%. You are getting **0.66%**. Birmingham ranks **5.31** with 29 impressions and zero clicks.

The rankings exist. The snippet isn't earning the click.

### Why

Current metadata (from `generateMetadata`):

```
Title:  Tap Water Quality in Newcastle upon Tyne — Nitrates, Lead, Chlorine | Water Directory
Desc:   Newcastle upon Tyne tap water is supplied by Northumbrian Water.
        Nitrates: 4.2 mg/L, Lead: 1.1 µg/L. See full lab results from official DWI data.
```

Three problems:

1. **Title is ~88 characters.** Truncates around 60. "| Water Directory" is burning 17 characters Google appends anyway.
2. **It leads with chemicals nobody searches.** Zero queries in the entire export contain "nitrates" or "lead". Not one.
3. **It does not answer the question being asked.** See below.

### What people are actually searching

Grouping the query export by intent:

| Cluster | Impressions | Clicks | Avg position |
|---|---|---|---|
| **Hardness — hard or soft?** | ~121 | 0 | 8–15 |
| **Safe to drink?** | ~93 | 0 | ~7 |
| **Water testing services (Bucks)** | ~162 | 0 | 9–33 |
| Supplier lookup | ~76 | 0 | 12–23 |
| Postcode / "near me" checker | ~20 | 0 | 1–76 |

Representative queries, all with **zero clicks**:

```
is newcastle tap water safe to drink        27 imp   pos 7.19
milton keynes water hardness                23 imp   pos 10.87
water hardness newcastle                    21 imp   pos 15.05
can you drink tap water in newcastle        19 imp   pos 6.95
water hardness milton keynes                16 imp   pos 12.25
is milton keynes a hard water area          12 imp   pos 10.00
is newcastle water hard or soft             10 imp   pos 8.70
does newcastle have hard or soft water      10 imp   pos 8.50
```

**Hardness and safety are the entire demand curve. Neither word appears in your titles.**

### You already have the answer

`lib/hardness-estimate.ts` classifies by county geology and is already imported into the town page:

- **Newcastle upon Tyne** → Tyne and Wear → `soft` (~50 mg/L CaCO₃)
- **Milton Keynes** → Buckinghamshire → `veryhard` (~350 mg/L CaCO₃)

Someone searches *"is milton keynes a hard water area"*. You rank position 10. You know the answer is **yes, very hard**. The title says "Nitrates, Lead, Chlorine".

That is the gap. It is a metadata change, not a data project.

---

## 5. Proposed metadata rewrite

In `app/water-quality/[slug]/page.tsx`, `generateMetadata`:

### Title

```ts
const HARD_WORD: Record<HardnessEstimateCategory, string> = {
  soft: "Soft",
  moderate: "Moderately Hard",
  hard: "Hard",
  veryhard: "Very Hard",
};

// e.g. "Milton Keynes Tap Water: Very Hard — Is It Safe to Drink?"  (57 chars)
// e.g. "Newcastle upon Tyne Tap Water: Soft — Is It Safe to Drink?"   (58 chars)
const title = `${town.name} Tap Water: ${HARD_WORD[cat]} — Is It Safe to Drink?`;
```

Drop `| Water Directory`. Google appends the site name itself and you cannot afford the characters.

### Description

```ts
// ~150 chars, leads with the answer
const description =
  `${town.name} tap water is ${HARD_WORD[cat].toLowerCase()} (~${midpoint} mg/L CaCO₃), ` +
  `supplied by ${sup}. Nitrates ${n} mg/L. Official DWI lab data by postcode.`;
```

### Add FAQ schema

The "safe to drink" and "hard or soft" clusters are question queries at position 7. FAQPage JSON-LD on the town template, with the answers filled from live data, targets exactly these and can win a rich result. Four questions, generated per town:

- Is {town} tap water safe to drink?
- Is {town} hard or soft water?
- Who supplies {town}'s tap water?
- What is the water hardness in {town}?

### Add an above-the-fold answer line

Before any gauges or tables: **"Milton Keynes has very hard water (~350 mg/L CaCO₃)."** Plain sentence, matches the query, gives Google a snippet to lift.

### Expected effect

Getting CTR from 0.66% to a normal 2.5% at current impressions is 14 clicks → ~53. Same rankings, same traffic, no new content. It compounds with every impression gained afterwards.

---

## 6. Two opportunities in the data

### 6a. A commercial cluster you aren't serving

**162 impressions, zero clicks**, all one shape:

```
water testing fenny stratford buckinghamshire        31   pos 17.65
water testing wolverton buckinghamshire              24   pos 25.83
water testing bletchley and fenny stratford bucks    21   pos 33.38
water testing newcastle                              21   pos 9.86
water testing newcastle upon tyne                    19   pos 6.95
water testing olney buckinghamshire                  16   pos 25.12
water testing milton keynes buckinghamshire          14   pos 9.21
water testing newport pagnell buckinghamshire        11   pos 21.73
water testing stony stratford buckinghamshire         9   pos 33.22
water testing tyne and wear                           7   pos 8.14
```

This is **service intent** — people wanting a lab to test their water, not a page of DWI data. You rank because you mention the towns, then fail to convert because the intent doesn't match.

You already have `app/api/leads/`. This is a lead-gen page type, not a data page type. Worth its own template.

### 6b. The postcode-area idea is already validated

From your notes: *build `/postcode-area/[outward]` — ~2,900 URLs.* The export says Google is already doing this for you **with no dedicated pages**:

```
ne35   position 1
ne27   position 3
mk1    position 5
```

Plus the generic checker queries you are built to own:

```
water postcode checker              pos 9
water fluoride postcode checker     pos 9
do i live in hard water area        pos 2
quality of water in my area         pos 6
how hard is water in my area        pos 91
water hardness near me              pos 76
```

Full-postcode resolution is your genuine differentiator over tapwater.uk. The demand is confirmed. **But do not build 2,900 pages while 52 URLs sit un-indexed** — that makes the crawl problem worse, not better. Sequence matters.

---

## 7. Priority order

| # | Action | Effort | Why now |
|---|---|---|---|
| 1 | Rewrite town page title/meta (hardness + safety led) | 1 hr | Fixes 82% of impressions, rankings already exist |
| 2 | Delete 3 stub pages, 301 to `/blog/`, clean sitemap | 30 min | Stops wasting crawl budget on empty pages |
| 3 | Clear the 9 Redirect errors, re-request validation | 30 min | Outstanding since the apex→www fix |
| 4 | Add FAQ schema + answer line to town template | 2 hr | Targets the 93-impression question cluster |
| 5 | Internal linking: home + `/suppliers` → all 53 towns | 1 hr | Directly addresses "Discovered – not indexed" |
| 6 | Rebuild Newcastle + Milton Keynes as deep pages | 1 day | Prove the template before scaling |
| 7 | Water testing lead-gen template (Bucks + Tyne) | 1 day | 162 impressions of commercial intent, unserved |
| 8 | `/postcode-area/[outward]` build | 1 week | Validated — but only once indexing recovers |

**Items 1–5 are a single afternoon and touch two files.** They should happen before any new content is written.

---

## 8. Handoff to Cursor

Items 1–5 are one Cursor Agent session. Files in scope:

```
app/water-quality/[slug]/page.tsx     # metadata, FAQ schema, answer line
app/sitemap.ts                        # remove 3 stub URLs
app/water-quality-home-buying/        # delete
app/hard-water-skin-health/           # delete
app/water-quality-for-babies/         # delete
next.config.ts                        # add 3x 301 redirects
lib/hardness-estimate.ts              # read only — already correct
```

Git from Mac Terminal, not the Cursor terminal:

```
cd ~/Desktop/all/Water-Directory/water-app && git add . && git commit -m "SEO: hardness-led metadata, remove stub pages" && git push
```

After deploy: re-submit sitemap, request validation on Redirect errors, and request indexing on the two town pages manually.

---

## 9. Measure

Re-export GSC in 14 and 28 days. The numbers that matter:

- **Indexed pages: 13 → target 40+** (the real KPI)
- **CTR: 0.66% → target 2%+**
- Clicks: 14/month → target 50+
- Newcastle CTR: 0.48% → target 2.5%
- Whether any "water testing" query converts

Position is *not* a KPI here. You already rank. The problem is everything downstream of ranking.

---

## 10. What was actually changed (31 Jul)

Implemented in the working tree, **not committed**.

| File | Change |
|---|---|
| `app/water-quality/[slug]/page.tsx` | `resolveHardness()` helper (lab CaCO₃ → county geology fallback); hardness-led title + description; FAQPage JSON-LD; visible FAQ section; above-fold direct-answer line |
| `components/SiteFooter.tsx` | **New.** All 27 live towns × 2 page types + guides, linked site-wide |
| `app/layout.tsx` | Mounted `<SiteFooter />` |
| `app/sitemap.ts` | Removed 3 stub URLs; town water-quality pages 0.8 → 0.9 weekly; sewage 0.7 daily; about 0.8 → 0.6 |
| `next.config.ts` | Three permanent 301s from stubs → `/blog/` equivalents |
| `components/WaterLookup.tsx` | Three homepage hub cards repointed from stubs to `/blog/` articles |
| `app/water-quality-home-buying/` | **Deleted** |
| `app/hard-water-skin-health/` | **Deleted** |
| `app/water-quality-for-babies/` | **Deleted** |
| `lib/api-rate-limit.ts` | Pre-existing `prefer-const` lint error fixed (unrelated, was blocking a clean lint) |

### Verification done

- `npx tsc --noEmit` — clean
- `npx eslint app components lib` — clean
- All 27 live towns resolve to a hardness band; **zero unclassified**
- Generated titles 43–59 chars (under the ~60 truncation point)
- Generated descriptions ~145 chars (under ~155)

### Verification still needed (local)

```
cd ~/Desktop/all/Water-Directory/water-app
npm run build
```

Then spot-check `/water-quality/newcastle` and `/water-quality/milton-keynes`, and validate the FAQ markup at https://search.google.com/test/rich-results

### Before/after — Milton Keynes

```
BEFORE
Title:  Tap Water Quality in Milton Keynes — Nitrates, Lead, Chlorine | Water Directory   (88 chars, truncates)
Desc:   Milton Keynes tap water is supplied by Anglian Water. Nitrates: 4.20 mg/L,
        Lead: 1.10 µg/L. See full lab results from official DWI data.

AFTER
Title:  Milton Keynes Tap Water: Very hard — Is It Safe to Drink?                         (57 chars)
Desc:   Milton Keynes tap water is very hard (~350 mg/L CaCO₃), supplied by Anglian
        Water. Nitrates 4.20 mg/L. Official DWI lab data, checkable by postcode.          (145 chars)
```

### Commit (Mac Terminal, not Cursor)

```
cd ~/Desktop/all/Water-Directory/water-app && git add . && git commit -m "SEO: hardness-led metadata, FAQ schema, site footer, remove stub pages" && git push
```

**Note:** `upload_yorkshire.py` and `.DS_Store` also show as modified in the repo — those were already uncommitted before this session and are unrelated. Check them before a blanket `git add .`.

---

## 11. Water testing lead-gen pages (item 7 — also built)

The 162-impression "water testing" cluster had **zero** matching pages. The
critical detail: those queries are not for the 27 towns in `TOWNS` — they are
Milton Keynes *suburbs* (Fenny Stratford, Bletchley, Wolverton, Stony Stratford,
Newport Pagnell, Olney) plus Tyneside. A separate locality list was needed.

| File | Purpose |
|---|---|
| `lib/water-testing-localities.ts` | 13 localities in 2 clusters, each carrying its supplier, county and observed GSC impressions |
| `app/water-testing/page.tsx` | Hub — the three routes to getting water tested |
| `app/water-testing/[slug]/page.tsx` | Per-locality page + FAQ schema + enquiry form |
| `components/WaterTestEnquiryForm.tsx` | Client form, posts to existing `/api/leads` |

**No database change needed.** Leads are stored using the existing columns:
`interest_type` = `water-testing:<slug>`, `property_age` = the reason selected.
Filter on `interest_type LIKE 'water-testing:%'` to separate them.

### Editorial position

These pages lead with *"try this before you pay anyone"* — check published DWI
data, then call your supplier, who must investigate mains complaints free. Paid
testing is presented as warranted only for private supplies, suspected lead
pipework, persistent unresolved problems, or documented landlord/business
records.

That is deliberate. It is what a searcher actually needs, it is what makes the
page worth ranking, and it avoids implying Water Directory performs testing —
which it does not. Every page carries that disclaimer.

### Coverage check

- 13 pages, all resolving a hardness band, none missing
- Titles 45–59 chars
- 182 of the observed July impressions now have a matching page
- Milton Keynes cluster (9 pages) is very hard ~350 mg/L; Tyne cluster (4) soft ~50

### ⚠️ Decision needed before this goes live

The form promises to email UKAS-accredited lab options. **You need a fulfilment
process before pushing it** — either a lab partner/affiliate, or a saved reply
you send manually. Options:

1. Manual reply from a `leads` query — fine at this volume, zero setup
2. Affiliate or referral arrangement with a testing lab
3. Soften the copy to "we'll point you in the right direction" if neither is ready

Do not ship the form collecting emails you have no plan to answer.

---

## 12. Town page depth (item 6) — done

The town template was ~1,000 source words including all the markup, so very
little actual prose. Google was being asked to rank a page of numbers against
question queries. Added:

- **"What these readings mean"** — nitrates, lead, fluoride and chlorine each
  with the live figure, the UK PCV, and what the substance actually is
- **"Living with hard water in {town}"** — renders only above 200 mg/L, so it
  appears on Milton Keynes and not Newcastle
- **Cross-link to the matching `/water-testing/` page**, connecting the data
  pages to the commercial cluster

Source words on the template: **1,026 → 2,368**. This lifts all 27 town pages.

### Accuracy note on limits

`READING_NOTES` uses the Water Supply (Water Quality) Regulations 2016 PCVs:
nitrate 50 mg/L, lead 10 µg/L, fluoride 1.5 mg/L. **Chlorine has no statutory
PCV** — it is controlled for taste and odour — so it is described rather than
scored.

### The chlorine limit bug — found in review, now fixed

Flagged as a theoretical concern, then confirmed live in Chris's own local
screenshots: **Milton Keynes showed "All tested parameters are within safe
drinking water limits". Newcastle did not.**

Newcastle chlorine reads 0.63 mg/L. The code treated 0.5 mg/L as a legal
ceiling. **No such limit exists.** The Water Supply (Water Quality) Regulations
2016 set no PCV for free chlorine — it is controlled for taste and odour, and a
residual is *required* through the network to keep water safe in transit.

Consequences, all on the site's highest-traffic page:

| Where | Symptom |
|---|---|
| Town page safety panel | Suppressed on Newcastle — the page ranking for *"is newcastle tap water safe to drink"* declined to say yes |
| Town page FAQ answer | Fell through to the hedged variant instead of opening "Yes." |
| Homepage scorecard | Rendered chlorine **red, "Above legal limit"** — telling users their water was illegal |
| Gauge captions | Labelled a fictional 0.5 mg/L as "PCV / limit" |

Fixed in three files:

- `app/water-quality/[slug]/page.tsx` — chlorine dropped from the `legal` test
- `components/TownWaterGauges.tsx` — scaled to the WHO guideline (5 mg/L), caption now "No UK limit · WHO guideline 5 mg/L"
- `components/WaterScorecard.tsx` — same scale and caption; red verdict reworded from "Above legal limit" to "Unusually high — worth reporting to your supplier"

Nitrate (50 mg/L), lead (10 µg/L) and fluoride (1.5 mg/L) are genuine PCVs and
are unchanged.

---

## 13. Redirect errors — investigated, nothing wrong. No code fix needed.

**Conclusion: the redirect configuration is correct and complete.** Verified
against the working tree and git history, and confirmed by the production build
reporting `ƒ Proxy (Middleware)`.

Three layers, all present and all tracked in git:

| Layer | File | Does |
|---|---|---|
| Platform | Vercel Settings → Domains | apex → www, 308 (fixed via UI; cannot be overridden from `vercel.json`) |
| Edge | `vercel.json` | host-scoped `/:path+/` → `https://www.waterdirectory.co.uk/:path+`, 308 |
| App | `proxy.ts` | trailing-slash 308, reimplementing what `skipTrailingSlashRedirect` disables |

`skipTrailingSlashRedirect: true` and `skipProxyUrlNormalize: true` in
`next.config.ts` exist to stop Next's built-in behaviour fighting the two layers
above. That is deliberate and correct, not a leftover.

The remaining 9 "Redirect error" pages are Google still working through cached
307s from before the Vercel UI fix. Validation shows "Started". This resolves on
Google's timetable, not yours. The 8 "Page with redirect" entries are
informational — that is redirects working as intended, not an error.

**One thing worth checking that I could not test from here:** the site is also
reachable at `water-directory.vercel.app`, and `vercel.json` only host-matches
the two `waterdirectory.co.uk` hosts. If Google has indexed the vercel.app
domain, that is duplicate content. Canonicals point to www, which mitigates it,
but a redirect or `noindex` would be cleaner.

Check with: `site:water-directory.vercel.app` in Google. If results appear, say
so and I will add a host redirect.

### After deploy

1. Re-submit sitemap in GSC
2. Request validation on the 9 Redirect errors
3. Manually request indexing for `/water-quality/newcastle` and `/water-quality/milton-keynes`
4. Re-export GSC in 14 days — watch **indexed page count** above all else

---

---

## 14. Results after 2.5 weeks (16 Aug 2026)

Deploy went out 31 Jul. 28-day GSC window is almost entirely post-deploy.

| | July | 28 days to 16 Aug | |
|---|---|---|---|
| Clicks | 14 | **36** | +157% |
| Impressions | 2,115 | **3,617** | +71% |
| CTR | 0.66% | **1.00%** | +51% |
| **Indexed pages** | **13** | **27** | +108% |

- **Redirect errors: validated and closed by Google.** All 9. Examples were all apex (`https://waterdirectory.co.uk/...`), confirming §13 — legacy 307s, not a config fault.
- **Milton Keynes**, the page we rewrote first: CTR 0.88% → **1.4%**, clicks 6 → 13, position 10.25 → **7.52**.
- **The footer worked.** Five town pages earning nothing in July now rank:
  `oxford` 116 imp / **5.17% CTR** / pos 4.83 · `hastings` 40 imp / **7.5%** / pos 4.45 · `york` 246 imp / pos 5.98 · `brighton` 101 imp · `plymouth` 72 imp
- **Water-testing pages ranked inside 3 weeks** — 159 impressions; `water testing woburn sands buckinghamshire` at position **2.77**, `water testing ryton` at **3.29**. No clicks yet, volumes tiny.
- **Unplanned:** a `private water supply [town] buckinghamshire` cluster appeared, created by the private-supply content on the testing pages. One at position 3.33.

### Newcastle — investigated, then dropped

Two hypotheses tested against a page-filtered export, both **wrong**:

- *Navigational pollution* ("newcastle united", hotels, council) — 4 impressions total
- *Generic national hardness queries* — 23 impressions total

Actual split for the page: 356 impressions on Newcastle-specific queries (3 clicks, avg position **8.76**), 23 generic, and **1,107 impressions (74%) anonymised by Google even with the page filter.**

Conclusion: not diagnosable, and not worth more effort. Oxford runs the identical template at 5.17% CTR from position 4.83; Newcastle sits at 8.76. That is a ranking gap, not a metadata gap, and metadata cannot fix rank.

**Live hypothesis for the invisible 74%:** conversational fragments appear in the export at positions 1–6 — `yes`, `is it clean`, `can you tell me`, `how to check`, `safe to drink?`, `whats my water`. Those are the signature of AI Mode fan-out. Such queries are unique, low-volume, get anonymised, and rarely click because the answer is given inline. Check the generative-AI report linked from the Performance page to confirm.

### ⚠️ Correction: FAQ rich results

Earlier in this doc I said FAQ schema "can win a rich result". **That was wrong.** Google restricted FAQ rich results in 2023 to authoritative government and health sites. `Search appearance.csv` for this property is empty, consistent with that. The visible FAQ content still earns its place — it answers the query on-page and feeds AI answers — but there is no rich-result upside.

---

## 15. Sewage-spills template deepened (16 Aug)

51 pages remained "Discovered – currently not indexed", overwhelmingly `/sewage-spills/*`. The water-quality pages got depth and got indexed; their sewage twins did not and did not. Same fix applied.

`app/sewage-spills/[slug]/page.tsx` — **1,084 → 2,178 source words**:

| Change | Detail |
|---|---|
| Title | `Sewage Spills in X — 2024 Storm Overflow Data \| Water Directory` (~73 chars, truncating) → `X Sewage Spills: 1,243 in 2024` (34–46 chars). Leads with the number. |
| Description | Now carries spills, hours and site count |
| Direct-answer line | Prose sentence above the stat bar, matching query wording |
| "What this data does and does not tell you" | Four honest caveats — EDM counts events not volume; monitor coverage rose sharply to ~full by end of 2023 so year-on-year comparisons need care; permitted ≠ harmless; 5 km radius ≠ boundary |
| Reporting section | EA hotline 0800 80 70 60 (England), NRW 0300 065 3000 (Wales), plus the operator |
| FAQ + JSON-LD | Five questions from live data: how many, why it happens, is it legal, **is it safe to swim**, who to report to |

**Editorial note:** sewage is emotive and the easy play is outrage. These pages deliberately do the opposite — they explain that rising counts partly reflect better monitoring, and that "permitted" and "harmless" are different claims. That is more useful, more defensible, and more likely to earn links than a scare page.

⚠️ **Verify before pushing:** the two incident hotline numbers. They are stated from knowledge, not fetched, and a wrong public-safety number would be bad.

---

## Open questions

- Hardness estimates are geology-based, not measured. Fine for metadata, but the page must label them as estimates. Sourcing real CaCO₃ figures (think-digital PDFs / company sites) upgrades the whole hardness cluster.
- Milton Keynes at ~350 mg/L is well past the 200 mg/L Harvey Water Softeners affiliate trigger. The highest-intent hardness traffic is already landing on a page that could carry that CTA.
- Newcastle is soft water — the softener CTA is wrong there. Hardness-conditional CTAs, not sitewide.

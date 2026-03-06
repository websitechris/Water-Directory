# UK Water Directory – Next.js App

Migrated from vanilla HTML/JS to Next.js App Router with Tailwind.

## Setup

1. Copy `.env.local.example` to `.env.local` and add your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

2. Install dependencies (already done):
   ```bash
   npm install
   ```

## Run

```bash
npm run dev    # Development – http://localhost:3000
npm run build  # Production build
npm start      # Production server
```

## Structure

- **`app/page.tsx`** – Main page with search form
- **`app/api/water/route.ts`** – Server-side API: postcode → postcodes.io → LSOA → Supabase (water_zones, chemical_readings, sewage)
- **`app/api/leads/route.ts`** – Lead form submissions (Supabase keys hidden from browser)
- **`components/WaterLookup.tsx`** – Search form, results, lead modal
- **`components/WaterScorecard.tsx`** – Clean white clinical scorecard UI

## API

**GET** `/api/water?postcode=CB1%201AA`  
**POST** `/api/water` with `{ "postcode": "CB1 1AA" }`

Returns water quality data, supplier, chemicals, nearest sewage spill.

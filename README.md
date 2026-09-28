# The Living Logger — Supabase Edition

> *A self-contained workout logging app that lives in Supabase, synced across devices, with Google Sign-In.*

This is the migration from localStorage (`vitality.logger.v3/v4`) to a **user‑scoped Supabase database**. Google OAuth, Row Level Security (RLS), and a one‑time data migration preserve every feature the app already had.

## What you get

- One static HTML file: `index.html`
- A modular JS architecture: `js/supabase.js`, `js/auth.js`, `js/database.js`, `js/app.js`
- Supabase SQL schema: `supabase/schema.sql`
- Zero runtime builds — deploy directly to Vercel
- Google Sign-In (OAuth) before any workout data is shown
- Each user owns their training days, exercises, sets, sessions and settings (RLS enforces this)
- **Migration**: When you sign in for the first time, any existing `vitality.logger.*` localStorage data is imported into Supabase, then localStorage is cleared. Subsequent sessions read/write to Supabase exclusively.

> **IMPORTANT**: This build is the *entire* result of the 2025 migration from the old pure‑localStorage logger to a Supabase‑backed version. The UI, UX and every workout‑tracking feature are exactly the same as the original — no redesign, no new features, no unused scaffolding.

## QUICK CHECKLIST (post‑migration)

✅ Google OAuth works (single sign‑in, no passwords)
✅ Profile auto‑created on first sign‑in
✅ Each user sees only their own data (RLS)
✅ Sets saved instantly to Supabase
✅ Workout sessions persist
✅ Progressive overload / history preserved
✅ Training‑day split saved across devices
✅ Exercise library owned per user
✅ Settings (kg/lbs, active day) persisted
✅ Reset functionality works per user
✅ Old localStorage data migrated once and then discarded
✅ App loads fast: authenticate → load data → render logger
✅ No service‑role keys in any frontend code
✅ Deployable as a static site on Vercel
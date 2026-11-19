# MAMBA

Portfolio website for a model & content creator — built with SvelteKit, with all content loaded from Supabase.

## Run it locally

```sh
npm install
cp .env.example .env   # then fill in the Supabase URL and publishable key
npm run dev
```

The site runs at http://localhost:5173.

## Folder overview

```
src/
  routes/            pages (home, digitals, portfolio, work, work/[slug])
  lib/
    components/      shared Svelte components (Header)
    styles/          global.css — design tokens, fonts, base styles
    supabase.js      the Supabase client
    api.js           data functions used by the pages
  env.js             environment variable definitions
static/
  fonts/             Pointer, Vtks Absurdo, Telegraf
supabase/
  schema.sql         database tables, security policies, storage bucket, example rows
```

# MAMBA

Portfolio website for a model & content creator — built with SvelteKit, with all content loaded from Supabase.

## Run it locally

```sh
npm install
cp .env.example .env   # then fill in the Supabase URL and publishable key
npm run dev
```

The site runs at http://localhost:5173.

## Routes

```
/                                → home
/digitals                        → digitals
/portfolio                       → portfolio
/work                            → choice: modelling / content creation
/work/modelling                  → modelling grid (?type=brand|campaign|runway|magazine)
/work/modelling/[slug]           → modelling detail
/work/content-creation           → content creation grid (?type=brand|concept)
/work/content-creation/[slug]    → content creation detail
```

## Folder overview

```
src/
  app.html           page shell — links the global stylesheet
  routes/            pages (see Routes above)
  lib/
    components/      shared Svelte components (Header, ProjectDetail)
    supabase.js      the Supabase client
    api.js           data functions and the projectUrl() helper
  env.js             environment variable definitions
static/
  stylesheet.css     design tokens, fonts, base styles
  fonts/             Pointer, Vtks Absurdo, Telegraf
supabase/
  schema.sql         database tables, security policies, storage bucket, example rows
```

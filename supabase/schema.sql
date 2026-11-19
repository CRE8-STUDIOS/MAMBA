-- =============================================================================
-- MAMBA portfolio — Supabase schema
--
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run more than once: tables use IF NOT EXISTS, and policies,
-- triggers and the bucket are dropped/upserted before being (re)created.
--
-- Contents
--   0. Extensions & helpers
--   1. profile
--   2. digitals
--   3. projects
--   4. project_images
--   5. portfolio_spreads
--   6. Grants (which API roles may touch which tables)
--   7. Row Level Security policies
--   8. Storage bucket "media"
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS & HELPERS
-- -----------------------------------------------------------------------------

-- gen_random_uuid() is built into Postgres 13+, which Supabase uses.
-- pgcrypto is enabled anyway in case an older project needs it.
create extension if not exists pgcrypto;

-- Trigger function: sets updated_at to now() whenever a row is updated,
-- so you never have to fill it in by hand.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 1. PROFILE — one row with the model's info (Digitals page + home)
-- -----------------------------------------------------------------------------

create table if not exists public.profile (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,

  -- Measurements in centimetres (whole numbers; change to numeric(5,1)
  -- if you need half centimetres).
  height_cm       smallint check (height_cm between 50 and 250),
  bust_cm         smallint check (bust_cm   between 30 and 200),
  waist_cm        smallint check (waist_cm  between 30 and 200),
  hips_cm         smallint check (hips_cm   between 30 and 200),

  -- Sizes are text because they can look like "S", "36", "EU 38", "8.5".
  top_size        text,
  bottom_size     text,
  shoe_size       text,

  hair            text,
  eyes            text,
  bio             text,

  headshot_url    text,
  hero_media_url  text,   -- image or video for the home hero
  instagram_url   text,
  tiktok_url      text,

  updated_at      timestamptz not null default now()
);

comment on table public.profile is
  'Single row with the model''s info, shown on the home and Digitals pages.';

-- Guarantees the table can only ever hold ONE row: every row would have the
-- same value (true) in this index, so a second insert fails.
create unique index if not exists profile_single_row
  on public.profile ((true));

-- Keep updated_at current on every edit.
drop trigger if exists profile_set_updated_at on public.profile;
create trigger profile_set_updated_at
  before update on public.profile
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. DIGITALS — photos in the 2x2 grid on the Digitals page
-- -----------------------------------------------------------------------------

create table if not exists public.digitals (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,
  alt_text    text not null default '',   -- describe the photo for screen readers
  sort_order  integer not null default 0, -- lower numbers show first
  created_at  timestamptz not null default now()
);

comment on table public.digitals is
  'Photos for the 2x2 grid on the Digitals page, ordered by sort_order.';

create index if not exists digitals_sort_order_idx
  on public.digitals (sort_order);


-- -----------------------------------------------------------------------------
-- 3. PROJECTS — every piece of work (Work pages + project detail page)
-- -----------------------------------------------------------------------------

create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),

  -- Used in URLs such as project.html?slug=cold-culture.
  -- Lowercase letters, numbers and single hyphens only.
  slug             text not null unique
                   check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  title            text not null,
  category         text not null
                   check (category in ('modelling', 'content_creation')),
  type             text not null,

  brand_name       text,
  brand_logo_url   text,
  cover_image_url  text,
  description      text,

  -- Background colour of the detail page, e.g. #33240f.
  theme_color      text check (theme_color ~ '^#[0-9a-fA-F]{6}$'),

  -- Drafts stay hidden from the public site until this is set to true.
  is_published     boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),

  -- The allowed "type" depends on the category:
  --   modelling        → brand, campaign, runway, magazine
  --   content_creation → brand, concept
  constraint projects_type_matches_category check (
    (category = 'modelling'        and type in ('brand', 'campaign', 'runway', 'magazine'))
    or
    (category = 'content_creation' and type in ('brand', 'concept'))
  )
);

comment on table public.projects is
  'All work. Only rows with is_published = true are visible to the public site.';

-- Work pages sort by sort_order and filter by category/type.
create index if not exists projects_sort_order_idx
  on public.projects (sort_order);

create index if not exists projects_category_type_idx
  on public.projects (category, type);

-- (slug already has an index because it is UNIQUE.)


-- -----------------------------------------------------------------------------
-- 4. PROJECT_IMAGES — gallery images on a project detail page
-- -----------------------------------------------------------------------------

create table if not exists public.project_images (
  id          uuid primary key default gen_random_uuid(),

  -- Deleting a project deletes its gallery images too.
  project_id  uuid not null
              references public.projects (id) on delete cascade,

  image_url   text not null,
  alt_text    text not null default '',
  sort_order  integer not null default 0
);

comment on table public.project_images is
  'Gallery images for one project''s detail page.';

-- The detail page asks for "images of project X, in order", so one index on
-- both columns covers the lookup and the sorting (and the foreign key).
create index if not exists project_images_project_sort_idx
  on public.project_images (project_id, sort_order);

create index if not exists project_images_sort_order_idx
  on public.project_images (sort_order);


-- -----------------------------------------------------------------------------
-- 5. PORTFOLIO_SPREADS — magazine spreads in the Portfolio slider
-- -----------------------------------------------------------------------------

create table if not exists public.portfolio_spreads (
  id          uuid primary key default gen_random_uuid(),
  image_url   text not null,
  caption     text,          -- e.g. "PUMA X HORATI"
  note        text,          -- small red text under the caption

  -- Optional link to the related project. If that project is deleted,
  -- the spread stays and the link is simply cleared.
  project_id  uuid
              references public.projects (id) on delete set null,

  sort_order  integer not null default 0
);

comment on table public.portfolio_spreads is
  'Magazine spreads for the Portfolio slider, optionally linked to a project.';

create index if not exists portfolio_spreads_sort_order_idx
  on public.portfolio_spreads (sort_order);

create index if not exists portfolio_spreads_project_id_idx
  on public.portfolio_spreads (project_id);


-- -----------------------------------------------------------------------------
-- 6. GRANTS
-- Supabase's API connects as "anon" (visitors) or "authenticated" (signed-in
-- users). Grants decide which commands a role may attempt at all; the RLS
-- policies in section 7 then decide which ROWS it may see or change.
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select
  on public.profile, public.digitals, public.projects,
     public.project_images, public.portfolio_spreads
  to anon, authenticated;

grant insert, update, delete
  on public.profile, public.digitals, public.projects,
     public.project_images, public.portfolio_spreads
  to authenticated;


-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- With RLS on, nobody can read or write a row unless a policy allows it.
--   • Visitors (anon) can read everything public.
--   • Unpublished projects — and their gallery images — are hidden from them.
--   • Signed-in users (authenticated) can read everything, including drafts,
--     and can insert, update and delete.
-- -----------------------------------------------------------------------------

alter table public.profile           enable row level security;
alter table public.digitals          enable row level security;
alter table public.projects          enable row level security;
alter table public.project_images    enable row level security;
alter table public.portfolio_spreads enable row level security;


-- ---- profile ---------------------------------------------------------------

drop policy if exists "profile: public read"        on public.profile;
drop policy if exists "profile: authenticated write" on public.profile;

create policy "profile: public read"
  on public.profile for select
  to anon, authenticated
  using (true);

-- "for all" covers insert, update and delete (select is already covered above).
create policy "profile: authenticated write"
  on public.profile for all
  to authenticated
  using (true)
  with check (true);


-- ---- digitals --------------------------------------------------------------

drop policy if exists "digitals: public read"         on public.digitals;
drop policy if exists "digitals: authenticated write" on public.digitals;

create policy "digitals: public read"
  on public.digitals for select
  to anon, authenticated
  using (true);

create policy "digitals: authenticated write"
  on public.digitals for all
  to authenticated
  using (true)
  with check (true);


-- ---- projects --------------------------------------------------------------

drop policy if exists "projects: public read published" on public.projects;
drop policy if exists "projects: authenticated read all" on public.projects;
drop policy if exists "projects: authenticated write"   on public.projects;

-- Visitors only see published projects.
create policy "projects: public read published"
  on public.projects for select
  to anon
  using (is_published = true);

-- Signed-in users also see drafts, so you can preview and edit them.
create policy "projects: authenticated read all"
  on public.projects for select
  to authenticated
  using (true);

create policy "projects: authenticated write"
  on public.projects for all
  to authenticated
  using (true)
  with check (true);


-- ---- project_images --------------------------------------------------------

drop policy if exists "project_images: public read published" on public.project_images;
drop policy if exists "project_images: authenticated read all" on public.project_images;
drop policy if exists "project_images: authenticated write"   on public.project_images;

-- Visitors only see images whose project is published, so a draft's gallery
-- can't be read early by querying this table directly.
create policy "project_images: public read published"
  on public.project_images for select
  to anon
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_images.project_id
        and p.is_published = true
    )
  );

create policy "project_images: authenticated read all"
  on public.project_images for select
  to authenticated
  using (true);

create policy "project_images: authenticated write"
  on public.project_images for all
  to authenticated
  using (true)
  with check (true);


-- ---- portfolio_spreads -----------------------------------------------------

drop policy if exists "portfolio_spreads: public read"         on public.portfolio_spreads;
drop policy if exists "portfolio_spreads: authenticated write" on public.portfolio_spreads;

create policy "portfolio_spreads: public read"
  on public.portfolio_spreads for select
  to anon, authenticated
  using (true);

create policy "portfolio_spreads: authenticated write"
  on public.portfolio_spreads for all
  to authenticated
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 8. STORAGE — public bucket "media" for images and videos
-- A public bucket serves files at
--   https://<project>.supabase.co/storage/v1/object/public/media/<path>
-- to anyone. Uploading, replacing and deleting require a signed-in user.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media: public read"          on storage.objects;
drop policy if exists "media: authenticated upload" on storage.objects;
drop policy if exists "media: authenticated update" on storage.objects;
drop policy if exists "media: authenticated delete" on storage.objects;

-- Lets the API list and download files in "media" (public URLs work anyway).
create policy "media: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

create policy "media: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

-- Needed to overwrite a file (upsert) or rename/move it.
create policy "media: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');

create policy "media: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media');

-- =============================================================================
-- End of schema
-- =============================================================================

-- Minimal tutorial content (SPEC-0.0.8). Four modes: direct, pointer_only, pointer_plus_full, pointer_plus_excerpt.
create type public.tutorial_content_mode as enum (
  'direct',              -- content stored only in yrS3
  'pointer_only',        -- external ref only, no stored content
  'pointer_plus_full',   -- external ref + full document stored
  'pointer_plus_excerpt' -- external ref + excerpt stored
);

create table if not exists public.tutorials (
  id uuid primary key default gen_random_uuid(),
  title text,
  external_ref text,
  content_mode public.tutorial_content_mode not null default 'direct',
  stored_content_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.tutorials.external_ref is 'URL, ISBN/title/page, or other external reference';
comment on column public.tutorials.stored_content_path is 'Path to stored document or excerpt in FS or object storage';

create index if not exists idx_tutorials_updated_at on public.tutorials(updated_at);

alter table public.tutorials enable row level security;
create policy "Tutorials readable by authenticated"
  on public.tutorials for select to authenticated using (true);
create policy "Tutorials insert by authenticated"
  on public.tutorials for insert to authenticated with check (true);
create policy "Tutorials update by authenticated"
  on public.tutorials for update to authenticated using (true);
create policy "Tutorials delete by authenticated"
  on public.tutorials for delete to authenticated using (true);

create table if not exists public.tutorial_facts (
  tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  primary key (tutorial_id, fact_id)
);
create index if not exists idx_tutorial_facts_fact_id on public.tutorial_facts(fact_id);

alter table public.tutorial_facts enable row level security;
create policy "Tutorial facts readable by authenticated"
  on public.tutorial_facts for select to authenticated using (true);
create policy "Tutorial facts insert by authenticated"
  on public.tutorial_facts for insert to authenticated with check (true);
create policy "Tutorial facts delete by authenticated"
  on public.tutorial_facts for delete to authenticated using (true);

-- Tutorial tag paths (hierarchical tag path strings, no FK to tags for flexibility).
create table if not exists public.tutorial_tag_paths (
  tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  tag_path text not null,
  primary key (tutorial_id, tag_path)
);
create index if not exists idx_tutorial_tag_paths_tag_path on public.tutorial_tag_paths(tag_path);

alter table public.tutorial_tag_paths enable row level security;
create policy "Tutorial tag paths readable by authenticated"
  on public.tutorial_tag_paths for select to authenticated using (true);
create policy "Tutorial tag paths insert by authenticated"
  on public.tutorial_tag_paths for insert to authenticated with check (true);
create policy "Tutorial tag paths delete by authenticated"
  on public.tutorial_tag_paths for delete to authenticated using (true);

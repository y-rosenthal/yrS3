-- Hierarchical tags taxonomy (SPEC-0.0.8). Path separator is "/" (e.g. programming/python/if).
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.tags(id) on delete cascade,
  path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tags_parent_id on public.tags(parent_id);
create index if not exists idx_tags_path on public.tags(path);
create index if not exists idx_tags_path_prefix on public.tags(path text_pattern_ops);

comment on table public.tags is 'Hierarchical tag taxonomy; path format domain/subdomain/term (e.g. programming/python/if)';

alter table public.tags enable row level security;

create policy "Tags readable by authenticated"
  on public.tags for select to authenticated using (true);

create policy "Tags insert by authenticated"
  on public.tags for insert to authenticated with check (true);

create policy "Tags update by authenticated"
  on public.tags for update to authenticated using (true);

create policy "Tags delete by authenticated"
  on public.tags for delete to authenticated using (true);

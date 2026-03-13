-- Override and merge logging for AI duplicate-detection workflow (SPEC-0.0.8).
create type public.override_entity_type as enum ('tag', 'fact');

create table if not exists public.override_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type public.override_entity_type not null,
  entity_id uuid not null,
  ai_summary text,
  human_rebuttal text,
  conversation_json jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_override_logs_entity on public.override_logs(entity_type, entity_id);
create index if not exists idx_override_logs_created_at on public.override_logs(created_at);

comment on table public.override_logs is 'Logged when human overrides AI duplicate recommendation';

alter table public.override_logs enable row level security;
create policy "Override logs readable by authenticated"
  on public.override_logs for select to authenticated using (true);
create policy "Override logs insert by authenticated"
  on public.override_logs for insert to authenticated with check (true);

-- Merge history: which tag/fact was merged into which (for recovery and audit).
create type public.merge_entity_type as enum ('tag', 'fact');

create table if not exists public.merge_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type public.merge_entity_type not null,
  surviving_id uuid not null,
  merged_id uuid not null,
  merged_at timestamptz not null default now(),
  merged_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_merge_logs_entity_type on public.merge_logs(entity_type);
create index if not exists idx_merge_logs_merged_id on public.merge_logs(merged_id);

comment on table public.merge_logs is 'History of tag/fact merges for recovery and audit';

alter table public.merge_logs enable row level security;
create policy "Merge logs readable by authenticated"
  on public.merge_logs for select to authenticated using (true);
create policy "Merge logs insert by authenticated"
  on public.merge_logs for insert to authenticated with check (true);

-- Question versions: one row per immutable version (plan: versioned questions, ownership)
create table if not exists public.question_versions (
  id uuid primary key default gen_random_uuid(),
  logical_id uuid not null,
  version text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text,
  domain text,
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (logical_id, version)
);

create index if not exists idx_question_versions_owner on public.question_versions(owner_id);
create index if not exists idx_question_versions_logical_id on public.question_versions(logical_id);

alter table public.question_versions enable row level security;

-- Anyone authenticated can read (for taking tests)
create policy "Question versions readable by authenticated"
  on public.question_versions for select to authenticated using (true);

-- Only owner can insert (create new version) or delete
create policy "Question versions insert by owner"
  on public.question_versions for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "Question versions delete by owner"
  on public.question_versions for delete to authenticated
  using (auth.uid() = owner_id);

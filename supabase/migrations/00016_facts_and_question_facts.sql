-- Canonical facts and question–fact links (SPEC-0.0.8).
create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  canonical_text text not null,
  tag_path text,
  subject text,
  predicate text,
  object text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_facts_tag_path on public.facts(tag_path);
create index if not exists idx_facts_updated_at on public.facts(updated_at);

-- Full-text search for canonical_text (scalable to millions).
alter table public.facts
  add column canonical_text_tsv tsvector
  generated always as (to_tsvector('english', coalesce(canonical_text, ''))) stored;
create index idx_facts_canonical_text_tsv on public.facts using gin(canonical_text_tsv);

comment on table public.facts is 'Canonical facts for mapping questions and tutorials to shared knowledge';

alter table public.facts enable row level security;

create policy "Facts readable by authenticated"
  on public.facts for select to authenticated using (true);
create policy "Facts insert by authenticated"
  on public.facts for insert to authenticated with check (true);
create policy "Facts update by authenticated"
  on public.facts for update to authenticated using (true);
create policy "Facts delete by authenticated"
  on public.facts for delete to authenticated using (true);

-- Question prerequisite facts: this question requires understanding this fact.
create table if not exists public.question_prerequisite_facts (
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  primary key (question_version_id, fact_id)
);

create index if not exists idx_question_prerequisite_facts_fact_id
  on public.question_prerequisite_facts(fact_id);

alter table public.question_prerequisite_facts enable row level security;
create policy "Question prerequisite facts readable by authenticated"
  on public.question_prerequisite_facts for select to authenticated using (true);
create policy "Question prerequisite facts insert by authenticated"
  on public.question_prerequisite_facts for insert to authenticated with check (true);
create policy "Question prerequisite facts delete by authenticated"
  on public.question_prerequisite_facts for delete to authenticated using (true);

-- Question "covers" facts: this question exercises or reinforces this fact (optional).
create table if not exists public.question_facts (
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  fact_id uuid not null references public.facts(id) on delete cascade,
  primary key (question_version_id, fact_id)
);

create index if not exists idx_question_facts_fact_id on public.question_facts(fact_id);

alter table public.question_facts enable row level security;
create policy "Question facts readable by authenticated"
  on public.question_facts for select to authenticated using (true);
create policy "Question facts insert by authenticated"
  on public.question_facts for insert to authenticated with check (true);
create policy "Question facts delete by authenticated"
  on public.question_facts for delete to authenticated using (true);

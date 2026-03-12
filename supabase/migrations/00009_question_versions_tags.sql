-- Question tags for filtering and discovery (SPEC-0.0.6)
alter table public.question_versions
  add column if not exists tags text[] not null default '{}';

create index if not exists idx_question_versions_tags
  on public.question_versions using gin(tags);

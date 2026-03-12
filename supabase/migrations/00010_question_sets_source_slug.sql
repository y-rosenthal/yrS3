-- Question sets synced from filesystem have a stable slug (folder name) for upsert.
-- Application listing/get use DB only; FS is imported via sync (same model as questions).

alter table public.question_sets
  add column if not exists source_slug text;

create unique index if not exists idx_question_sets_source_slug_unique
  on public.question_sets(source_slug)
  where source_slug is not null;

comment on column public.question_sets.source_slug is
  'Folder name under question-sets/ when set was synced from FS; null for UI-created sets.';

-- Optional prompt snippet for list display and full-text search (first ~200 chars of prompt).
alter table public.question_versions
  add column if not exists prompt_snippet text;

-- Optional sandbox zip reference for question sets (shared folder tree for bash questions)
alter table public.question_sets
  add column if not exists sandbox_zip_ref text;

-- Allow logical_id to be text (slug or UUID) so uploads with folder names like q-bash-001 can record ownership.
alter table public.question_versions
  alter column logical_id type text using logical_id::text;

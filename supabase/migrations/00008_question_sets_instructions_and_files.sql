-- Question set instructions and attached files (SPEC-QUESTION-SETS extension)

-- Instructions shown to the user when taking the set
alter table public.question_sets
  add column if not exists instructions text;

-- Attached files: stored server-side; description stored in DB
create table if not exists public.question_set_files (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references public.question_sets(id) on delete cascade,
  filename text not null,
  description text,
  stored_path text not null,
  created_at timestamptz default now()
);

create index if not exists idx_question_set_files_question_set_id
  on public.question_set_files(question_set_id);

alter table public.question_set_files enable row level security;
create policy "Question set files readable by authenticated"
  on public.question_set_files for select to authenticated using (true);
create policy "Question set files insert by authenticated"
  on public.question_set_files for insert to authenticated with check (true);
create policy "Question set files delete by authenticated"
  on public.question_set_files for delete to authenticated using (true);

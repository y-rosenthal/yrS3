-- Question sets (SPEC-QUESTION-SETS-0.0.2): tables and test_sessions.set_id

-- One row per question set (DB-backed; file-based sets use QUESTION-SET-FORMAT)
create table if not exists public.question_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Ordered questions in each set
create table if not exists public.question_set_items (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references public.question_sets(id) on delete cascade,
  question_logical_id text not null,
  position int not null,
  unique(question_set_id, question_logical_id)
);

-- RLS for question_sets: all authenticated can read; authenticated can insert (owner_id = self)
alter table public.question_sets enable row level security;
create policy "Question sets readable by authenticated"
  on public.question_sets for select to authenticated using (true);
create policy "Question sets insert by authenticated"
  on public.question_sets for insert to authenticated with check (true);

-- RLS for question_set_items: read for authenticated; insert/update/delete when owner of parent set
alter table public.question_set_items enable row level security;
create policy "Question set items readable by authenticated"
  on public.question_set_items for select to authenticated using (true);
create policy "Question set items insert by authenticated"
  on public.question_set_items for insert to authenticated with check (true);

-- Migrate test_sessions: replace test_id (text) with set_id (uuid → question_sets)
-- Breaking: clear existing sessions (no mapping from old test_id to new question_sets)
delete from public.answers;
delete from public.test_sessions;

alter table public.test_sessions drop column if exists test_id;
alter table public.test_sessions add column set_id uuid not null references public.question_sets(id) on delete cascade;

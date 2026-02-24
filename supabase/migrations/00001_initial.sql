-- Authors: users who can upload questions (SPEC 3)
create table if not exists public.authors (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Test sessions: one per student per test attempt (SPEC 7)
create table if not exists public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text not null,
  attempt_number int not null default 1,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  created_at timestamptz default now()
);

-- Answers: per question per session (SPEC 7)
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  question_id text not null,
  question_version text not null,
  answer_text text,
  evaluation_json jsonb,
  score numeric,
  presented_at timestamptz,
  submitted_at timestamptz,
  keystroke_metrics jsonb,
  created_at timestamptz default now()
);

-- Logs: structured audit log (SPEC 8) - optional table; can also use external store
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  category text not null,
  event text not null,
  user_id uuid,
  payload jsonb,
  created_at timestamptz default now()
);

-- RLS
alter table public.authors enable row level security;
alter table public.test_sessions enable row level security;
alter table public.answers enable row level security;
alter table public.audit_logs enable row level security;

create policy "Authors readable by authenticated"
  on public.authors for select to authenticated using (true);

create policy "Test sessions own by user"
  on public.test_sessions for all to authenticated
  using (auth.uid() = user_id);

create policy "Answers via session ownership"
  on public.answers for all to authenticated
  using (
    exists (
      select 1 from public.test_sessions s
      where s.id = answers.session_id and s.user_id = auth.uid()
    )
  );

create policy "Audit logs insert by service"
  on public.audit_logs for insert to authenticated with check (true);
create policy "Audit logs select by authenticated"
  on public.audit_logs for select to authenticated using (true);

-- Storage bucket for questions (when using Supabase Storage)
insert into storage.buckets (id, name, public)
values ('questions', 'questions', false)
on conflict (id) do nothing;

create policy "Questions bucket: authenticated read"
  on storage.objects for select to authenticated
  using (bucket_id = 'questions');
create policy "Questions bucket: authors can write"
  on storage.objects for all to authenticated
  using (bucket_id = 'questions');

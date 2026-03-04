-- Drop authors table and policies (all users can create questions; no separate author role).
drop policy if exists "Authors readable by authenticated" on public.authors;
drop table if exists public.authors;

-- Pending versions: any user can propose a new version; only approved versions are "official".
-- status: 'pending' | 'approved'. approved = official, used in tests and as latest.
-- proposed_by: user who created this version (null if owner created it and it was auto-approved).
alter table public.question_versions
  add column if not exists status text not null default 'approved',
  add column if not exists proposed_by uuid references auth.users(id) on delete set null;

-- Only approved versions count as "latest" for tests (enforced in application code).
-- Owner can approve pending versions via API.

-- RLS: allow any authenticated user to insert (non-owners insert with owner_id = question owner, status = pending).
drop policy if exists "Question versions insert by owner" on public.question_versions;
create policy "Question versions insert by authenticated"
  on public.question_versions for insert to authenticated with check (true);

-- Owner may update their rows (e.g. approve: set status = 'approved').
create policy "Question versions update by owner"
  on public.question_versions for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

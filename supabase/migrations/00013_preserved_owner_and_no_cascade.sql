-- Preserve ownership history when a user is deleted. Questions and sets are not deleted;
-- owner_id becomes null (ON DELETE SET NULL) and preserved_owner_id keeps the original owner
-- for display and filtering (e.g. "questions by this user").

-- ========== question_versions ==========
alter table public.question_versions
  add column if not exists preserved_owner_id uuid;

comment on column public.question_versions.preserved_owner_id is
  'Original owner UUID; kept when owner_id is nulled after user delete. Used for display and filter-by-owner.';

update public.question_versions
set preserved_owner_id = owner_id
where preserved_owner_id is null and owner_id is not null;

-- Set preserved_owner_id on insert/update when owner_id is set (keep first owner)
create or replace function public.set_question_versions_preserved_owner()
returns trigger as $$
begin
  new.preserved_owner_id := coalesce(new.preserved_owner_id, new.owner_id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_question_versions_preserved_owner_trigger on public.question_versions;
create trigger set_question_versions_preserved_owner_trigger
  before insert or update of owner_id on public.question_versions
  for each row execute function public.set_question_versions_preserved_owner();

-- Backfill preserved_owner_id for any rows still missing it (e.g. created before trigger)
update public.question_versions
set preserved_owner_id = owner_id
where preserved_owner_id is null and owner_id is not null;

-- Switch owner_id to ON DELETE SET NULL so deleting a user does not delete questions
alter table public.question_versions
  drop constraint if exists question_versions_owner_id_fkey;

alter table public.question_versions
  alter column owner_id drop not null;

alter table public.question_versions
  add constraint question_versions_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;

-- When a user is deleted, capture owner_id into preserved_owner_id before FK nulls it
create or replace function public.capture_question_versions_owner_before_delete()
returns trigger as $$
begin
  update public.question_versions
  set preserved_owner_id = owner_id
  where owner_id = old.id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists capture_question_versions_owner_before_delete_trigger on auth.users;
create trigger capture_question_versions_owner_before_delete_trigger
  before delete on auth.users
  for each row execute function public.capture_question_versions_owner_before_delete();

create index if not exists idx_question_versions_preserved_owner
  on public.question_versions(preserved_owner_id) where preserved_owner_id is not null;

-- RLS: allow read when user is current owner or row is orphaned (owner_id null)
drop policy if exists "Question versions readable by authenticated" on public.question_versions;
create policy "Question versions readable by authenticated"
  on public.question_versions for select to authenticated
  using (owner_id = auth.uid() or owner_id is null);

-- Update/delete only when current owner (orphaned rows are read-only)
drop policy if exists "Question versions update by owner" on public.question_versions;
create policy "Question versions update by owner"
  on public.question_versions for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Question versions delete by owner" on public.question_versions;
create policy "Question versions delete by owner"
  on public.question_versions for delete to authenticated
  using (owner_id = auth.uid());

-- ========== question_sets (already ON DELETE SET NULL; add preserved_owner_id) ==========
alter table public.question_sets
  add column if not exists preserved_owner_id uuid;

comment on column public.question_sets.preserved_owner_id is
  'Original owner UUID when set was created; kept when owner_id is nulled after user delete.';

update public.question_sets
set preserved_owner_id = owner_id
where preserved_owner_id is null and owner_id is not null;

create or replace function public.set_question_sets_preserved_owner()
returns trigger as $$
begin
  new.preserved_owner_id := coalesce(new.preserved_owner_id, new.owner_id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_question_sets_preserved_owner_trigger on public.question_sets;
create trigger set_question_sets_preserved_owner_trigger
  before insert or update of owner_id on public.question_sets
  for each row execute function public.set_question_sets_preserved_owner();

create or replace function public.capture_question_sets_owner_before_delete()
returns trigger as $$
begin
  update public.question_sets
  set preserved_owner_id = owner_id
  where owner_id = old.id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists capture_question_sets_owner_before_delete_trigger on auth.users;
create trigger capture_question_sets_owner_before_delete_trigger
  before delete on auth.users
  for each row execute function public.capture_question_sets_owner_before_delete();

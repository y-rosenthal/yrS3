-- Allow all authenticated users to read all question_versions (browse, take tests).
-- Update/delete remain owner-only; orphaned rows (owner_id null) remain read-only for mutations.
drop policy if exists "Question versions readable by authenticated" on public.question_versions;
create policy "Question versions readable by authenticated"
  on public.question_versions for select to authenticated
  using (true);

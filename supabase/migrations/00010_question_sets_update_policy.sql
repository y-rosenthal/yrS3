-- Allow authenticated users to update question sets (e.g. instructions)
create policy "Question sets update by authenticated"
  on public.question_sets for update to authenticated using (true) with check (true);

-- Optional seed: one question set for development (if you have a question with logical id q-mult-001)
insert into public.question_sets (id, title, description)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Sample question set',
  'Default set for local development. Add questions via the UI or question-sets/ folder.'
)
on conflict (id) do nothing;

insert into public.question_set_items (question_set_id, question_logical_id, position)
values ('a0000000-0000-0000-0000-000000000001', 'q-mult-001', 1)
on conflict (question_set_id, question_logical_id) do nothing;

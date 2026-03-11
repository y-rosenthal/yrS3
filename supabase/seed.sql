-- Seed data for local development (optional).
-- Default question owner: same UUID as DEFAULT_QUESTION_SYNC_OWNER_ID in src/lib/questions/sync-owner.ts
-- Used for FS→DB sync when QUESTION_SYNC_OWNER_ID is not set (e.g. after supabase db reset).
-- Email: default-question-owner@system.local  Password: default-question-owner-password

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  -- Must match DEFAULT_QUESTION_SYNC_OWNER_ID in src/lib/questions/sync-owner.ts
  v_user_id UUID := '00000000-0000-4000-8000-000000000001';
  v_encrypted_pw TEXT := crypt('default-question-owner-password', gen_salt('bf'));
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'default-question-owner@system.local',
    v_encrypted_pw,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW()
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    format('{"sub": "%s", "email": "default-question-owner@system.local"}', v_user_id)::jsonb,
    'email',
    v_user_id,
    NOW(),
    NOW(),
    NOW()
  );

END $$;

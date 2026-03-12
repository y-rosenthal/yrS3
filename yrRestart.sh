#!/usr/bin/env bash
set -x
supabase stop
supabase start
supabase db reset
npm run dev

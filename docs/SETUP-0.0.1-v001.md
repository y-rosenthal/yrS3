# Setup & Run — SPEC 0.0.1

This document describes how to set up and run the Tutorial & Testing System MVP locally (Ubuntu KDE) and deploy to Vercel and Supabase. It is versioned for **SPEC 0.0.1** (see DOC-GUIDE-v001.md).

---

## 1. Prerequisites

- **Node.js** 20+ and **npm**
- **Git**
- **Supabase** account (for auth and optional question storage)
- **GitHub** account (for OAuth)
- For local run only: **Bash** available (for code-question sandbox)

---

## 2. Local development (Ubuntu KDE)

### 2.1 Clone and install

```bash
cd /path/to/yrS3
npm install
```

### 2.2 Environment variables

Copy the example env file and fill in your Supabase values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — from [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from the same page (anon/public key)

Leave `QUESTIONS_STORAGE` unset so the app uses the **filesystem** for questions (recommended for local dev).

Optional:

- `QUESTIONS_ROOT` — directory for question folders (default: `./questions`)
- `TESTS_CONFIG` — JSON array of test definitions (see Section 5)

### 2.3 Supabase project setup

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. Enable **GitHub** in Authentication → Providers.
3. In Authentication → URL Configuration, set:
   - **Site URL**: `http://localhost:3000` (for local)
   - **Redirect URLs**: add `http://localhost:3000/auth/callback`
4. Run the initial migration so tables and storage exist:
   - Either link the project: `npx supabase link --project-ref YOUR_REF` and run `npx supabase db push`
   - Or run the SQL in `supabase/migrations/00001_initial.sql` manually in the SQL Editor (create tables and, if using Supabase for questions, the `questions` bucket).
5. **Add an author**: in the SQL Editor run (replace `USER_UUID` with your Supabase user id after first sign-in):
   ```sql
   insert into public.authors (id) values ('USER_UUID') on conflict (id) do nothing;
   ```
   To find your user id: sign in once with GitHub, then in Supabase Dashboard → Authentication → Users, copy your user UUID.

### 2.4 Create questions directory (filesystem mode)

```bash
mkdir -p questions
```

Add at least one question so tests have content. Example for a multiple-choice question:

**questions/q-mult-001/meta.yaml**

```yaml
id: q-mult-001
type: multiple_choice
version: "1"
title: Sample multiple choice
```

**questions/q-mult-001/prompt.md**

```markdown
What is 2 + 2?
```

**questions/q-mult-001/options.yaml**

```yaml
- id: a
  text: "3"
- id: b
  text: "4"
  correct: true
- id: c
  text: "5"
```

### 2.5 Configure tests

Set `TESTS_CONFIG` in `.env.local` to include question ids, or add a test that references them. Example:

```bash
# In .env.local (single line, no line breaks inside the JSON)
TESTS_CONFIG=[{"id":"test-1","title":"Sample Test","description":"First test","questionIds":["q-mult-001"]}]
```

### 2.6 Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with GitHub, then:

- **Take a test**: use “Take a test” and complete the flow.
- **Author**: if your user is in the `authors` table, use “Author — Upload & manage questions” to upload new or modified questions.

---

## 3. Deploy to Vercel and Supabase

### 3.1 Supabase (production)

1. In your Supabase project, set **Site URL** to your Vercel URL (e.g. `https://your-app.vercel.app`).
2. Add to **Redirect URLs**: `https://your-app.vercel.app/auth/callback`.
3. Ensure the migration has been applied (tables and, if used, storage bucket).

### 3.2 Vercel

1. Push your repo to GitHub and import the project in [Vercel](https://vercel.com).
2. In Vercel → Project → Settings → Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `QUESTIONS_STORAGE` = `supabase` (so questions are stored in Supabase Storage; Vercel has no persistent filesystem)
   - Optionally `QUESTIONS_BUCKET` (default: `questions`)
   - Optionally `TESTS_CONFIG` (same JSON format as above)
   - Optionally `NEXT_PUBLIC_APP_URL` = your Vercel URL
3. Deploy. The build runs `next build`; ensure no env-dependent build fails.

### 3.3 Questions on Vercel

With `QUESTIONS_STORAGE=supabase`, question files are read/written to the Supabase Storage bucket created by the migration. Authors upload via the Author UI; the app does not use a local `questions` folder in production.

---

## 4. Summary of environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Supabase anon key |
| `QUESTIONS_STORAGE` | No | (filesystem) | Set to `supabase` for Vercel |
| `QUESTIONS_ROOT` | No | `./questions` | Local path for question folders |
| `QUESTIONS_BUCKET` | No | `questions` | Supabase Storage bucket name |
| `TESTS_CONFIG` | No | (one empty test) | JSON array of test definitions |
| `NEXT_PUBLIC_APP_URL` | No | — | App URL for redirects |

---

## 5. Related documents

- **DOC-GUIDE-v001.md** — Documentation and versioning
- **SPEC-0.0.1.md** — MVP scope and behaviour
- **QUESTION-FORMAT-0.0.1.md** — Question folder layout and validation rules

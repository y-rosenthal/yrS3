# yrS3 — Tutorial & Testing System

A web-based tutorial and testing system for knowledge assessment. Version 0.0.1 focuses on the **testing component**: users log in, work with **question sets** (take as test, homework, or study list), answer questions (including multiple choice, short answer, and code), submit, and receive scores and feedback. The app supports question creation and upload, and creating question sets by choosing questions (stored in DB and/or filesystem). Optional local or hosted Supabase for auth and storage.

## Features (v0.0.1)

- **Question sets**: Create sets of questions (UI or file-based YAML); use any set as a test (answer → submit → view scores and feedback)
- **Testing flow**: Log in → open a question set → Take as test → answer questions → submit → view scores and detailed feedback
- **Question types**: Multiple choice, short answer, long answer, R code, Bash (automated and AI-assisted grading)
- **Authoring**: Upload new questions or modifications; questions are stored in the **database** (source of truth) and optionally mirrored to the **filesystem** (backup). Ownership and approval status live in the DB; optional `db_meta.yaml` in each version folder records that metadata for sync.
- **DB–FS sync**: When using the filesystem, the app syncs FS with DB on first list: FS-only versions are imported into the DB; when both exist and differ, DB wins (FS copy moved to `_conflicts`, DB version written to FS). All listing and tests use the database.
- **Authentication**: Email/password (with email confirmation) via Supabase; optional Google and GitHub OAuth
- **Backend**: Supabase for auth and optional storage; run Supabase locally (`supabase start`) or use a hosted project

## Tech stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend / auth**: Supabase (auth; optional database)
- **Deploy**: Vercel
- **Requirements**: Node.js 20+

## Getting started

1. **Clone and install**

   ```bash
   git clone <repo-url>
   cd yrS3
   npm install
   ```

2. **Environment variables**

   Copy the example env file and fill in your Supabase URL and anon key. Full steps (including creating a hosted or local Supabase project) are in the setup docs:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). For local Supabase, run `supabase start` and use `supabase status -o env` to get credentials; see the setup guide for details.

## Documentation

Project docs are in the **`docs/`** folder and are built as a Quarto book. Rendered HTML (after building) is in **`docs/_book/`**.

- **DOC-GUIDE** — How to navigate docs and version numbering
- **SPEC** — Initial MVP scope and technical spec; **SPEC-QUESTION-SETS** — Question sets (DB + file-based); **SPEC-DB-FS-QUESTION-SYNC** — DB–FS question sync, dual-write, and backup
- **SETUP** — Full setup and run (local + Vercel/Supabase deploy)
- **QUESTION-FORMAT** — Question folder layout, metadata, and optional `db_meta.yaml`
- **QUESTION-SET-FORMAT** — File-based question set layout (`set.yaml`)

To rebuild the docs book from the `docs/` directory:

```bash
quarto render
```

See `docs/QUARTO-DOC-GUIDE.qmd` for Quarto installation and usage.

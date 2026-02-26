# yrS3 — Tutorial & Testing System

A web-based tutorial and testing system for knowledge assessment. Version 0.0.1 focuses on the **testing component**: users log in, select tests, answer questions (including multiple choice, short answer, and code), submit, and receive scores and feedback. The app supports question authoring and upload, with optional local or hosted Supabase for auth and storage.

## Features (v0.0.1)

- **Testing flow**: Log in → select a test → answer questions → submit → view scores and detailed feedback
- **Question types**: Multiple choice, short answer, long answer, R code, Bash (automated and AI-assisted grading)
- **Authoring**: Upload new questions or modifications; questions live in filesystem folders (YAML + prompt per question)
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
- **SPEC** — Initial MVP scope and technical spec
- **SETUP** — Full setup and run (local + Vercel/Supabase deploy)
- **QUESTION-FORMAT** — Question folder layout, metadata, and evaluation

To rebuild the docs book from the `docs/` directory:

```bash
quarto render
```

See `docs/QUARTO-DOC-GUIDE.qmd` for Quarto installation and usage.

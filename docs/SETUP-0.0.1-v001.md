# Setup & Run — SPEC 0.0.1

This document describes how to set up and run the Tutorial & Testing System MVP locally (Ubuntu KDE) and deploy to Vercel and Supabase. It is versioned for **SPEC 0.0.1** (see DOC-GUIDE-v001.md). Where possible, instructions use **CLIs** instead of web dashboards.

You will need: a **Supabase** account (for auth and optional storage), a **GitHub** account (for OAuth), and for local code-question grading, **Bash** (normally available on Ubuntu).

---

## 1. Installing required software (Ubuntu / Plasma KDE)

Install the following on your machine. These steps assume Ubuntu (or a similar Debian-based distribution) with Plasma KDE.

### 1.1 Node.js 20+ and npm

Supabase CLI and the app require Node.js 20 or later. Use the NodeSource repository:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should be v20.x or higher
npm --version
```

Alternatively, use [nvm](https://github.com/nvm-sh/nvm): `nvm install 20 && nvm use 20`.

### 1.2 Git

```bash
sudo apt-get update
sudo apt-get install -y git
git --version
```

### 1.3 Docker (optional, for local Supabase stack)

Only needed if you run Supabase **locally** with `supabase start` (see Section 1.6). For using a **hosted** Supabase project (recommended for this app), you can skip Docker.

**Install Docker Engine on Ubuntu**

Official method using Docker’s apt repository:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io
```

Allow your user to run Docker without `sudo` (optional but convenient):

```bash
sudo usermod -aG docker $USER
```

Log out and back in (or run `newgrp docker`) so the group change takes effect.

Verify Docker:

```bash
docker run hello-world
```

If that runs successfully, Docker is installed. For more options (e.g. other distros), see [Install Docker Engine](https://docs.docker.com/engine/install/).

### 1.4 Supabase CLI

**Global npm install is not supported.** The Supabase CLI blocks `npm install -g supabase` by design. Use one of the methods below.

**Option A — Linux binary (recommended on Ubuntu)**

Download the latest binary and put it on your `PATH`:

```bash
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
sudo mv supabase /usr/local/bin/
supabase --version
```

For ARM64 (e.g. some ARM boards), use `supabase_linux_arm64.tar.gz` from the [releases page](https://github.com/supabase/cli/releases) instead.

**Option B — Homebrew (if you use Homebrew on Linux)**

```bash
brew install supabase/tap/supabase
supabase --version
```

If you don’t have Homebrew: [Install Homebrew](https://docs.brew.sh/Homebrew-on-Linux), then run the command above.

**Option C — npx (no global install)**

From the project directory (or any directory) you can run the CLI without installing it:

```bash
npx supabase --version
```

Use `npx supabase` instead of `supabase` for every command (e.g. `npx supabase login`, `npx supabase link --project-ref XXX`, `npx supabase db push`).

You will use the CLI to log in, link a hosted project, and push migrations. A [personal access token](https://supabase.com/dashboard/account/tokens) is required for `supabase login` (create one in the Dashboard once).

### 1.5 Vercel CLI (optional, for deploy from the terminal)

Only needed if you want to deploy and manage environment variables from the command line instead of the Vercel website.

**Option A — Homebrew (if you use Homebrew)**

```bash
brew install vercel-cli
vercel --version
```

Same approach as Supabase CLI if you installed that via Homebrew (Section 1.4 Option B). The formula is maintained in Homebrew and may lag the npm release slightly.

**Option B — npm (global)**

```bash
npm install -g vercel
vercel --version
```

Vercel still supports global npm install (unlike Supabase CLI). Use this if you don’t use Homebrew.

### 1.6 Running Supabase locally (optional)

If you want a **fully local** Supabase backend (no hosted project), you need **Docker** (Section 1.3) and the **Supabase CLI** (Section 1.4). The CLI does not “install” Supabase as a system service; it starts the Supabase stack (Postgres, Auth, Studio, etc.) in Docker containers.

**Start the local stack**

From your project root (where `supabase/` lives, or where you will run `supabase init`):

```bash
# Create supabase/ and config if you don’t have them yet
supabase init

# Start all services (Postgres, Auth, Studio, Storage, etc.). First run downloads images.
supabase start
```

This can take a few minutes the first time. When it finishes, the CLI prints **API URL**, **anon key**, **Studio URL**, and other values.

**Use local credentials in the app**

Export env vars or put them in `.env.local`:

```bash
supabase status -o env
```

Copy the `API URL` and `anon key` (or the whole block) into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Studio is usually at `http://127.0.0.1:54323` (see `supabase status`).

**Apply migrations**

```bash
supabase db reset
```

This applies all migrations in `supabase/migrations/` to the local database.

**GitHub OAuth (local Auth)**

The Supabase CLI does **not** provide a command to configure GitHub or Google OAuth. For local development you set providers in `supabase/config.toml`; for hosted projects you use the Dashboard (Authentication → Providers). The CLI only helps by giving you the Auth base URL for the callback (see below).

1. **Get your local Auth callback URL** (CLI):

   ```bash
   supabase status
   ```

   Note the **API URL** (e.g. `http://127.0.0.1:54321`). The callback URL is that base + `/auth/v1/callback`, e.g. `http://127.0.0.1:54321/auth/v1/callback`.

2. **Create a GitHub OAuth App** at [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers):
   - Homepage URL: `http://127.0.0.1:3000` (or your app URL)
   - Authorization callback URL: the value from step 1 (e.g. `http://127.0.0.1:54321/auth/v1/callback`)
   - Copy the Client ID and generate a Client Secret.

3. **Configure in `supabase/config.toml`** under `[auth.external.github]`:

   ```toml
   [auth.external.github]
   enabled = true
   client_id = "env(GITHUB_CLIENT_ID)"
   secret = "env(GITHUB_SECRET)"
   ```

   In your project root (or in `supabase/.env`), set `GITHUB_CLIENT_ID` and `GITHUB_SECRET` so the config can read them. Do not commit secrets to git.

4. Restart the stack if it was already running: `supabase stop` then `supabase start`.

**Google OAuth (local Auth)**

Same idea as GitHub: no CLI command; use `config.toml` and a Google OAuth client.

1. **Callback URL** — same as above: from `supabase status`, use API URL + `/auth/v1/callback`.

2. **Create a Google OAuth client** in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (APIs & Services → Credentials → Create Credentials → OAuth client ID). Use application type “Web application”, add the callback URL from step 1 to “Authorized redirect URIs”, and note the Client ID and Client Secret.

3. **Configure in `supabase/config.toml`** under `[auth.external.google]`:

   ```toml
   [auth.external.google]
   enabled = true
   client_id = "env(GOOGLE_CLIENT_ID)"
   secret = "env(GOOGLE_CLIENT_SECRET)"
   ```

   Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the environment (or `supabase/.env`). Restart with `supabase stop` then `supabase start`.

**Reference:** [Supabase: Managing config and secrets](https://supabase.com/docs/guides/local-development/managing-config).

**Stop the stack**

```bash
supabase stop
```

Use `supabase stop --no-backup` to remove local data. For day-to-day development with a hosted project, you can skip this section and use Section 2.3 instead.

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

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL (see Section 2.3)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon key (see Section 2.3)

Leave `QUESTIONS_STORAGE` unset so the app uses the **filesystem** for questions (recommended for local dev).

Optional:

- `QUESTIONS_ROOT` — directory for question folders (default: `./questions`)
- `TESTS_CONFIG` — JSON array of test definitions (see Section 5)

### 2.3 Supabase project setup (CLI-first where possible)

You need a **hosted** Supabase project for auth and (optionally) question storage. The CLI cannot create a new project; that is done once in the Dashboard. After that, use the CLI for linking and migrations. For **separate dev, test, and production** environments using multiple hosted projects (no Docker), see **Section 3.4**.

#### One-time: create project and auth settings (Dashboard)

1. Create a project: [Supabase Dashboard](https://supabase.com/dashboard) → **New project**. Note the **project ref** (e.g. `abcdefghijklmnop`) from the project URL or settings.
2. Get URL and anon key: **Project Settings** → **API** → **Project URL** and **anon** (public) key. Put these in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.  
   Project URL format: `https://<project-ref>.supabase.co`.
3. Enable GitHub OAuth: **Authentication** → **Providers** → **GitHub** → enable and set your GitHub OAuth App client id/secret.
4. Set redirect URLs: **Authentication** → **URL Configuration** → **Site URL** = `http://localhost:3000`; **Redirect URLs** add `http://localhost:3000/auth/callback`.

(There is no Supabase CLI command to create a project or to configure auth providers and redirect URLs; those remain in the Dashboard.)

#### Link project and push migrations (CLI)

From the repo root:

```bash
# Log in (you will be prompted for a personal access token; create one at https://supabase.com/dashboard/account/tokens)
supabase login

# Link this repo to your hosted project (use the project ref from the Dashboard)
supabase link --project-ref YOUR_PROJECT_REF
# When prompted, you can enter your database password or leave blank to skip DB validation; linking still works for db push.

# Push migrations so tables and storage bucket exist
supabase db push
```

If you prefer not to use the CLI, run the SQL in `supabase/migrations/00001_initial.sql` manually in the Dashboard **SQL Editor**.

#### Add an author

After your first sign-in with GitHub, add your user as an author. You need your Supabase user UUID (Dashboard → **Authentication** → **Users** → copy your user’s UUID).

**Option A — Dashboard:** **SQL Editor** → run:

```sql
insert into public.authors (id) values ('USER_UUID') on conflict (id) do nothing;
```

**Option B — psql:** From **Project Settings** → **Database** copy the connection string (URI), then:

```bash
psql "postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres" -c "insert into public.authors (id) values ('USER_UUID') on conflict (id) do nothing;"
```

Replace `USER_UUID` with your user id.

For a **fully local** Supabase backend instead of a hosted project, see **Section 1.6** (Docker and local Supabase).

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

Auth redirects must be updated for your production URL. This is not configurable via the Supabase CLI; use the **Dashboard** once:

1. **Authentication** → **URL Configuration** → **Site URL**: set to your Vercel URL (e.g. `https://your-app.vercel.app`).
2. **Redirect URLs**: add `https://your-app.vercel.app/auth/callback`.
3. Ensure migrations are applied (you already ran `supabase db push` in Section 2.3; the same linked project is used for production).

### 3.2 Vercel (CLI or Dashboard)

You can deploy and set environment variables either with the **Vercel CLI** or the Vercel website.

#### Option A — Vercel CLI

From the repo root:

```bash
# Log in (opens browser once)
vercel login

# Link to an existing Vercel project (or run `vercel` without link to create a new project on first deploy)
vercel link
# When prompted, choose your scope and select an existing project, or cancel and run `vercel` to create one.

# Add environment variables (repeat for each; use production, preview, or development as needed)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add QUESTIONS_STORAGE production
# When prompted for value, enter: supabase

# Optional
vercel env add QUESTIONS_BUCKET production
vercel env add TESTS_CONFIG production
vercel env add NEXT_PUBLIC_APP_URL production
```

Set values when prompted (for secrets, paste and press Enter). For `QUESTIONS_STORAGE` use the value `supabase` so questions are stored in Supabase Storage on Vercel.

Deploy:

```bash
vercel --prod
```

Subsequent deploys: `vercel --prod` or push to your linked Git branch for automatic deploys.

To pull env vars into a local `.env.local` (e.g. for testing production config locally):

```bash
vercel env pull .env.local
```

#### Option B — Vercel Dashboard

1. Push the repo to GitHub and import the project at [Vercel](https://vercel.com) → **Add New** → **Project**.
2. **Project** → **Settings** → **Environment Variables**. Add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `QUESTIONS_STORAGE` = `supabase`
   - Optionally `QUESTIONS_BUCKET`, `TESTS_CONFIG`, `NEXT_PUBLIC_APP_URL`
3. Deploy (automatic on push, or **Deployments** → **Redeploy**).

### 3.3 Questions on Vercel

With `QUESTIONS_STORAGE=supabase`, question files are read/written to the Supabase Storage bucket created by the migration. Authors upload via the Author UI; the app does not use a local `questions` folder in production.

### 3.4 Separate dev, test, and production environments (hosted Supabase)

When you are **not** using Docker and local Supabase, you can still keep **dev**, **test** (staging), and **production** separate by using multiple **hosted** Supabase projects and Vercel environments.

**Overview**

- **Dev** — Local app (`npm run dev`) and/or Vercel “Development” env; points at a **dev** Supabase project.
- **Test** — Preview deployments (e.g. PRs, `vercel` without `--prod`); points at a **test** Supabase project.
- **Production** — Live app (`vercel --prod` or main branch); points at a **production** Supabase project.

Each Supabase project has its own database, auth users, and storage. That way test and prod data stay isolated.

**1. Create three Supabase projects**

In the [Supabase Dashboard](https://supabase.com/dashboard), create three projects (e.g. `yrS3-dev`, `yrS3-test`, `yrS3-prod`). For each:

- Note the **project ref** and the **Project URL** and **anon key** (Project Settings → API).
- Enable **GitHub** under Authentication → Providers (use the same or different GitHub OAuth Apps per environment).
- Set **Authentication** → **URL Configuration**:
  - **Dev project:** Site URL `http://localhost:3000`; Redirect URLs: `http://localhost:3000/auth/callback`.
  - **Test project:** Site URL your Vercel preview URL (e.g. `https://yrS3-*.vercel.app` or a fixed preview domain); Redirect URLs: `https://*.vercel.app/auth/callback` or your exact preview URL plus `/auth/callback`.
  - **Production project:** Site URL your production URL; Redirect URLs: `https://your-app.vercel.app/auth/callback`.

**2. Push migrations to each project**

From the repo root, link and push to each project in turn:

```bash
supabase login
supabase link --project-ref DEV_PROJECT_REF
supabase db push
supabase link --project-ref TEST_PROJECT_REF
supabase db push
supabase link --project-ref PROD_PROJECT_REF
supabase db push
```

Your local repo is “linked” to whichever project you ran last; that’s fine. Each project now has the same schema.

**3. Local development (dev)**

In `.env.local` use the **dev** Supabase project URL and anon key. Run `npm run dev`. Sign-in and data stay in the dev project.

**4. Vercel environments (test and production)**

In Vercel, configure environment variables **per environment** (Production, Preview, Development):

- **Production:**  
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` = **production** Supabase project.  
  `QUESTIONS_STORAGE` = `supabase`, and optionally `NEXT_PUBLIC_APP_URL` = production URL.

- **Preview (test):**  
  Same variables but with the **test** Supabase project URL and anon key.  
  `NEXT_PUBLIC_APP_URL` = your preview base URL if needed.

- **Development (optional):**  
  Can point at the **dev** Supabase project for Vercel “dev” deployments.

**CLI:** Add vars per environment:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
# ... same for development if you use it
```

**Dashboard:** Project → Settings → Environment Variables → for each variable choose Production, Preview, and/or Development and set the value for each.

**5. Add authors per environment**

In each Supabase project (dev, test, prod), add author users as in Section 2.3 (“Add an author”) so the Author UI works in that environment. User IDs can differ between projects.

**Summary**

| Environment | App runs on        | Supabase project | Vercel env   |
|-------------|--------------------|------------------|--------------|
| Dev        | localhost          | dev              | —            |
| Test       | Vercel preview URL | test             | Preview      |
| Production | Vercel prod URL    | production       | Production   |

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

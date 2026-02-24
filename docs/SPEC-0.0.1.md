# SPEC — Initial MVP (v0.0.1)

Read DOC-GUIDE-v001.md for documentation navigation and version numbering.  
Refer to the latest PRD for the full system vision. This spec defines the **initial MVP** only—a subset of the full system.

---

## 1. MVP Scope Summary

### In scope (MVP)
- **Question storage**: Filesystem-based; each question in its own folder with text and metadata (no DB for question content yet).
- **Question authoring**: Authors develop questions offline and upload new questions or modifications via the app.
- **Authentication**: GitHub OAuth via Supabase (learners and question authors).
- **Student experience**: Take tests, answer questions (including coding in a sandboxed environment), submit, and see feedback.
- **Author experience**: Upload new questions; upload modifications to existing questions; view metadata (e.g. created/modified).
- **Progress and integrity**: Store student progress (attempts, timestamps, question id/version, timing); basic anti-cheat (keystroke timing, copy/paste controls); comprehensive logging.

### Out of scope (MVP)
- Database-backed question bank (questions live on filesystem only).
- Full tutorial authoring or tutorial flows.
- Advanced analytics, reporting, or social features.
- Google OAuth (MVP uses GitHub only).

---

## 2. Questions: Filesystem-Based Storage

### 2.1 Rationale
Questions are stored in the **filesystem**, not in the database, so that:
- Authors can develop and version questions on their own machine (e.g. with Git).
- Questions can be uploaded as a unit (folder + files) without a DB migration.
- The same format can later be imported into a DB if the system evolves.

### 2.2 Layout and metadata
- **One folder per question.**  
  See **docs/QUESTION-FORMAT-0.0.1.md** for the canonical folder layout, file names, metadata schema, and **all edge cases** (e.g. prompt file when both `prompt.md` and `prompt.txt` exist, id/type/version validation, type-specific required files, multiple-choice correctness). Implementations MUST follow that document so behavior is unambiguous.
- **Required metadata** (per question):
  - **Unique id** (e.g. UUID or slug) — stable across versions.
  - **Question type** — e.g. multiple choice, short answer, long answer, R coding, Bash, Excel formula, HTML, CSS (subset as needed for MVP).
  - **Version** — so modifications can be tracked and linked to student attempts.
- **Optional metadata**: title, domain, difficulty, rubric reference, etc., as defined in the question format doc.

### 2.3 Author workflow
- Author creates/edits the question folder and files locally (no need to be connected to the system).
- Author **uploads** via the app:
  - **New question**: upload a folder (or archive) that conforms to the question format; system assigns or validates id and stores under the configured questions root.
  - **Modification to existing question**: upload updated files for an existing id; system updates files and records a new version (e.g. version number or modified timestamp).
- System logs **when** each question was created and when it was last modified (and by whom, if auth provides it).

---

## 3. Authentication

- **Provider**: GitHub OAuth only (MVP).
- **Backend**: Supabase Auth (session management, user records).
- **Roles**: Distinguish between **learners** (students) and **question authors** (e.g. via Supabase role, claim, or a simple authors table/flag). Only authors can access upload and question-metadata UIs.
- **Behavior**: Users sign in with GitHub; session is used for all subsequent requests; student progress and logs are tied to the authenticated user.

---

## 4. Frontend — Question Authors

- **Upload new questions**: UI to select a question folder (or zip) and upload; server validates per QUESTION-FORMAT-0.0.1.md (required files, meta fields, type-specific rules, edge cases). If validation fails, upload is **rejected** and the author receives clear errors; if it passes, the question is stored under the questions root and creation time (and optionally author) is recorded.
- **Upload modifications**: UI to select an existing question (by id) and upload updated files; server validates per QUESTION-FORMAT-0.0.1.md. If validation fails, upload is **rejected** and no files are changed. If it passes, server replaces/updates only the provided files, leaves omitted required files (e.g. prompt) unchanged, and updates "modified" metadata and version.
- **Metadata display**: List or detail view of questions showing at least:
  - Question id, type, version.
  - When the question was created and when last modified.
- **Logging**: All upload and metadata-view actions are logged (who, when, which question id/version).

---

## 5. Frontend — Students (Learners)

- **Test selection**: List of available tests (tests can be defined in config or filesystem; which tests are “active” is MVP-defined).
- **Test taking**: 
  - Student selects a test and receives questions (order can be fixed or randomized per MVP choice).
  - For each question: prompt and any assets are shown; student answers (text, choice, or code as appropriate).
- **Coding questions**: For R, Bash, or other code-based types, the student is presented with a **sandboxed coding and execution environment** (e.g. in-browser or backed by a secure runner). Student writes code, runs it, and submits the final answer; execution is constrained per “Sandbox isolation” below.
- **Submission**: Student submits the test; answers are evaluated (per question type) and feedback is shown.
- **Logging**: All student actions are logged (test start/end, question view, answer edit, run code, submit) for auditing and anti-cheat.

---

## 6. Sandboxed Execution (Coding Questions)

- **Purpose**: Run user-submitted code (e.g. R, Bash) safely for grading.
- **Minimum viable isolation** (aligned with PRD):
  - No access to host filesystem, network, or environment secrets.
  - CPU and memory limits and execution timeouts.
- **MVP implementation**: To be chosen (e.g. container-based, serverless runner, or managed service); the interface used by the app is “run this code with these inputs” and “return stdout/stderr and exit code.”
- **Logging**: Every execution (question id, version, user, code hash or length, inputs, result) is logged for security and debugging.

---

## 7. Student Progress and Storage

Student progress is stored in **database and/or filesystem** (MVP can choose one or both). The following must be recorded:

- **Per attempt (per question or per test)**:
  - User id, test id, question id, **question version**.
  - Date/time when the question was presented and when the answer was submitted.
  - Time between presentation and submission (and optionally time per question).
- **Anti-cheat and integrity**:
  - **Keystroke timing**: Average (or distribution of) time between keystrokes where applicable (e.g. text/code answers) to help detect pasted content or automated input.
  - **Copy/paste controls**: Ability to **discourage or prevent** copy/paste of question text or answers (e.g. disable paste in code/text areas, or log paste events). Exact UX (prevent vs warn vs log-only) is an MVP decision.
- **Stored data**: At minimum, question id, version, timestamps, answer (or reference to it), evaluation result (score/feedback), and any keystroke/paste metrics agreed for MVP.

---

## 8. Logging

- **Principle**: Log everything that is needed for security, auditing, and debugging.
- **Scope** (non-exhaustive):
  - **Auth**: sign-in, sign-out, failures.
  - **Authors**: uploads (new question / modification), metadata views.
  - **Students**: test start/stop, question view, answer change, code run, submit; optional: keystroke/paste events if collected.
  - **System**: sandbox runs (inputs/outputs hashed or truncated if large), evaluator errors, upload validation failures.
- **Format and retention**: Logs should be structured (e.g. JSON) and stored in a dedicated store or filesystem; retention period is an MVP/deployment decision.

---

## 9. Technical Stack (MVP)

- **Frontend**: Next.js.
- **Auth & DB**: Supabase (GitHub OAuth, user tables, and tables for tests/sessions/answers if used in MVP).
- **Hosting**: Vercel (or equivalent) for Next.js and serverless/API routes.
- **Questions**: Filesystem under a configured root (e.g. in repo or mounted volume); format and metadata as in QUESTION-FORMAT-0.0.1.md.
- **Execution**: Sandbox implementation TBD (containers, serverless, or managed service).

---

## 10. Question Types in MVP

Support a **subset** of the PRD question types to keep MVP shippable. Recommended minimum:

1. **Multiple choice** — deterministic.
2. **Short answer** — AI or rule-based grading; deterministic scoring.
3. **At least one code type** — e.g. **R** or **Bash** — using the sandbox; output comparison for grading.

Additional types (long answer, Excel, HTML, CSS) can be added incrementally; each requires an evaluator module and, for code/formula, sandbox or equivalent.

---

## 11. Open Items / TODOs

- [ ] Finalize question folder layout and metadata schema in QUESTION-FORMAT-0.0.1.md.
- [ ] Define API contracts for upload, test listing, and submission.
- [ ] Choose sandbox implementation and document security constraints.
- [ ] Define evaluator output schema (score, pass/fail, feedback) for each supported type.
- [ ] Decide where student progress lives first (DB only, filesystem only, or both).
- [ ] Define how “tests” are composed in MVP (e.g. list of question ids in a config file or folder).
- [ ] Specify log format, storage, and retention.

---

## 12. Related Documents

- **DOC-GUIDE-v001.md** — Documentation and versioning.
- **PRD-0.0.1-v003.md** — Full product vision and requirements.
- **QUESTION-FORMAT-0.0.1.md** — Question filesystem layout and metadata schema (see next section).

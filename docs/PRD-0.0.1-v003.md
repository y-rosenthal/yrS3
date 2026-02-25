---
title: "PRD-0.0.1-v003.md"
---

# Product Vision Docuemnt 

See the DOCUMENTATION-GIDE.md file for a description of the naming
scheme for documentation files in this project.


## Tutorial & Testing System — v0.0.1

---

### 1. Overview
This project aims to build a web-based tutorial and testing system focused initially on **knowledge assessment**. Version 0.0.1 prioritizes the **testing component**, with extensibility toward tutorials in later versions.

The system is designed to be **modular and componentized** to support AI-assisted design and implementation, allowing each component to be developed, tested, and validated independently.

---

### 2. Goals & Non-Goals

#### Goals (v0.1)
- Deliver a functional testing platform
- Support multiple question types with automated and AI-assisted grading
- Enable secure user authentication
- Establish a scalable, modular architecture compatible with AI coding assistants

#### Non-Goals (v0.1)
- Full tutorial authoring workflows
- Advanced analytics or reporting
- Social or collaborative features

---

### 3. Target Users
- Learners testing technical knowledge
- Internal educational or training use
- Early adopters comfortable with AI-assisted grading

---

### 4. Scope: Knowledge Domains (Initial)
The system will support testing in the following areas:
- Bash commands and scripting
- R coding
- Regular Expressions in the following environments
  * Base R functions, e.g. grep, grepl, etc
  * Calling grep from Bash
- Excel formulas
- Excel pivot tables
- Excel charts
- HTML
- CSS

Each domain may reuse shared infrastructure but can define domain-specific evaluation logic.

---

### 5. Functional Requirements

#### 5.1 Authentication
v0.0.1 supports **modular authentication**: the tech team can implement one or more of the following, independently. Implementations are described so that options can be added incrementally (e.g. email/password first, then OAuth).

- **Email/password (primary for v0.0.1)**  
  - Full **email confirmation workflow**: sign up → confirmation email → user confirms → sign in.  
  - Session management and user records handled by **Supabase**.  
  - Recommended to implement first; no third-party OAuth setup required.

- **Google OAuth (optional)**  
  - Sign in with Google via Supabase Auth.  
  - Can be added after or alongside email/password; each provider is configured and implemented separately.

- **GitHub OAuth (optional)**  
  - Sign in with GitHub via Supabase Auth.  
  - Can be added after or alongside email/password; each provider is configured and implemented separately.

All auth options use the same Supabase Auth backend; the app treats authenticated users uniformly regardless of which provider they used to sign in.

---

#### 5.2 Testing Flow
- Users can:
  - Log in
  - Select a test
  - Answer questions
  - Submit a test
  - Receive scores and detailed feedback
- Tests may be:
  - Timed or untimed (configurable per test)
  - Single-attempt or multi-attempt (configurable per test)

---

### 6. Question Types & Evaluation Modules

Each question type is implemented as a **separate module** with:
- A defined input schema
- Evaluation logic
- Feedback output

#### Supported Question Types (v0.1)

1. **Multiple Choice**
   - Deterministic grading

2. **Short Answer**
   - AI-graded
   - Compared against expected answer
   - Deterministic scoring (see Section 10)

3. **Long Answer**
   - AI-graded
   - Rubric- or expectation-based
   - Deterministic scoring (see Section 10)

4. **R Coding Questions**
   - Expected answer provided as working R code
   - System generates multiple test inputs
   - Submitted code executed and outputs compared
   - Discrepancies returned as structured feedback

5. **Bash Commands**
   - Similar to R coding questions
   - Output comparison across generated inputs

6. **Excel Formulas**
   - Formula evaluated against generated datasets
   - Output comparison and mismatch explanation

7. **HTML Code**
   - Structural and semantic comparison
   - Optional rendering-based validation

8. **CSS Code**
   - Style rule comparison
   - Optional rendering-based validation

---

### 7. System Architecture

#### 7.1 Frontend
- **Next.js** web application
- Component-based UI aligned with question modules

#### 7.2 Backend & Infrastructure
- **Supabase**
  - Authentication
  - Database
- **Vercel**
  - Hosting
  - Serverless functions
- Secure execution environment for code-based questions

---

### 8. Modularity & AI-Assisted Development

The system is decomposed into small, testable components:

#### Core Modules
- **Auth Module**
  - Email/password with email confirmation via Supabase (primary); optionally Google and/or GitHub OAuth via Supabase. Each auth method is implemented and configured independently so the team can ship email/password first and add OAuth later.
  - Exposes: `getUser()`, `requireAuth()`

- **Test Engine**
  - Manages test sessions and submissions
  - Exposes: `startTest()`, `submitTest()`

- **Question Registry**
  - Maps question types to evaluator modules
  - Exposes: `getEvaluator(type)`

- **Evaluation Modules (one per question type)**
  - Input: question definition + user answer
  - Output: score, pass/fail, feedback

- **Execution Sandbox**
  - Secure runtime for executing user-submitted code
  - Exposes: `run(code, inputs)`

- **Feedback Generator**
  - Normalizes evaluator output into user-facing explanations

Each module:
- Can be designed independently
- Can be tested in isolation
- Is integrated via clearly defined interfaces

---

### 9. High-Level System Flow

```
User
 → Next.js UI
   → Auth Module (Supabase)
   → Test Engine
     → Question Registry
       → Evaluator Module
         → (optional) Execution Sandbox
     → Feedback Generator
 → UI renders results
```

---

### 10. Scoring & Evaluation Rules

#### Deterministic AI Scoring
Deterministic scoring means:
- Given the same question, expected answer, and user response
- The system always produces the same score and feedback
- No randomness, temperature, or probabilistic variation is allowed in grading

---

### 11. Sandbox Isolation (Minimum Viable Level)

Minimum viable sandbox isolation level refers to the lowest acceptable security boundary that:
- Prevents user-submitted code from accessing:
  - Host filesystem
  - Network
  - Environment secrets
- Enforces:
  - CPU and memory limits
  - Execution timeouts
- Allows safe execution of R, Bash, or formula logic

TODO: Decide on sandbox implementation strategy (e.g., container-based vs WASM vs managed service).

---

### 12. Database Schema (Initial)

#### users
- id (uuid, PK)
- email
- name
- created_at

#### tests
- id (uuid, PK)
- title
- description
- is_timed (boolean)
- time_limit_seconds (nullable)
- allow_multiple_attempts (boolean)
- created_at

#### questions
- id (uuid, PK)
- test_id (FK)
- type (enum)
- prompt
- config_json (expected answer, rubric, etc.)

#### test_sessions
- id (uuid, PK)
- user_id (FK)
- test_id (FK)
- attempt_number
- started_at
- submitted_at
- score

#### answers
- id (uuid, PK)
- session_id (FK)
- question_id (FK)
- answer_text
- evaluation_json
- score

---

### 13. User Stories (v0.1)

#### Authentication
- As a user, I want to sign up with email and password and confirm my email before signing in.
- As a user, I want to sign in with email/password (and optionally with Google or GitHub, if the team enables those providers).
- As a user, I want my test history associated with my account.

#### Test Taking
- As a user, I want to take timed or untimed tests.
- As a user, I want to retry tests when allowed.
- As a user, I want clear feedback explaining incorrect answers.

#### Administration
- As an admin, I want to define question types and expected answers.
- As an admin, I want to configure test timing and attempts.

---

### 14. Open Items / TODOs

TODO: Define API contracts for all core modules
TODO: Draft example question configuration JSON per question type
TODO: Specify sandbox security constraints in detail
TODO: Define evaluator output schema (score, feedback, diagnostics)
TODO: Decide on logging and error-handling strategy
TODO: Define initial test authoring workflow (admin-only vs UI-based)

---

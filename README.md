# AlumniConnect

A mentorship platform built with Next.js and Supabase. Mentees discover mentors through semantic matching or keyword search, send mentorship requests, and manage their connections. Administrators and moderators manage profile visibility and review audit logs.

Profiles use MiniLM embeddings with pgvector for semantic matching. PostgreSQL row-level security enforces access permissions.

## Local development

Prerequisites: Node.js, npm, and Docker running locally.

```bash
npm ci
npx supabase start
```

Create `.env.local` with the values from your local Supabase stack:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
SUPABASE_SERVICE_ROLE_KEY=<local service role key>
```

Keep `.env.local` out of version control. The service role key is server-only and must never use a `NEXT_PUBLIC_` prefix.

```bash
npm run dev
```

Open [AlumniConnect](http://localhost:3000) or [local Supabase Studio](http://127.0.0.1:54323). Sign up as a mentee or mentor and save your profile to generate its matching embedding. The first embedding run downloads the model and requires internet access.

## Verification

```bash
npm run lint
npm run build
```

With local Supabase running, execute the database access-control tests:

```bash
docker exec -i supabase_db_alumniconnect psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/rls_tests.sql
```

The synthetic matching evaluation lives in [scripts/eval/run-eval.mjs](scripts/eval/run-eval.mjs); its recorded methodology and results are in [docs/eval-results.md](docs/eval-results.md).

## Project layout

- `app/(marketing)`: landing page with a continuous white dot-field background.
- `app/(auth)`: registration and sign-in.
- `app/(dashboard)`: profiles, discovery, mentorship requests, and administration.
- `app/api`: embedding and matching endpoints.
- `lib`: Supabase clients and embedding helpers.
- `supabase/migrations`: versioned schema, policies, and database functions.
- `supabase/tests`: SQL access-control tests.
- `scripts`: local seed data, pipeline checks, and matching evaluation.

# AlumniConnect

[![CI](https://github.com/OmarMohammedSiddique/alumniconnect/actions/workflows/ci.yml/badge.svg)](https://github.com/OmarMohammedSiddique/alumniconnect/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)

An intelligent alumni mentorship platform that connects mentees with relevant
mentors through semantic matching, explainable recommendations, and secure
institutional oversight.

## About

AlumniConnect is a Strathmore University capstone project built to make alumni
networks easier to navigate. Instead of relying only on exact keyword matches,
the platform represents each profile as a 384-dimensional embedding and ranks
mentors by semantic similarity. A mentee interested in "data pipelines" can
therefore discover a mentor working on "ML platforms" even when their wording
does not overlap.

The system supports the complete mentorship workflow: account creation,
profile management, mentor discovery, mentorship requests, connections, and
staff moderation. PostgreSQL row-level security protects data at the database
layer, while server-only embedding generation prevents clients from modifying
their own matching vectors.

## Features

- Semantic mentor recommendations powered by MiniLM and pgvector.
- Keyword and category search for direct, user-controlled discovery.
- Explainable matches based on shared profile signals.
- Mentee and mentor onboarding with profile-based cold-start matching.
- Mentorship request, response, and connection workflows.
- Moderator and administrator controls with audit logging.
- Database-enforced authorization through PostgreSQL row-level security.
- Deterministic evaluation tooling for measuring recommendation quality.

## How it works

```text
Profile input
    |
    v
Next.js Server Action or Route Handler
    |
    +--> MiniLM embedding (384 dimensions)
    |         |
    |         v
    +--> Supabase Postgres + pgvector
              |
              v
      Ranked, explainable mentor matches
```

Embeddings are generated on the server and stored alongside profile data.
Matching uses cosine similarity, while PostgreSQL full-text search provides a
strong keyword baseline. See the [matching evaluation](docs/eval-results.md)
for the methodology and recorded results.

## Technology

| Area | Technology |
| --- | --- |
| Application | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, Base UI, shadcn/ui |
| Database and auth | Supabase, PostgreSQL, Row-Level Security |
| Recommendations | Transformers.js, MiniLM, pgvector |
| Motion and visuals | GSAP, React Three Fiber, Three.js |
| Quality | ESLint, TypeScript, GitHub Actions |

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- npm
- Docker Desktop

### Installation

1. Clone the repository and install dependencies.

   ```bash
   git clone https://github.com/OmarMohammedSiddique/alumniconnect.git
   cd alumniconnect
   npm ci
   ```

2. Start the local Supabase stack.

   ```bash
   npx supabase start
   ```

3. Create the local environment file.

   ```bash
   cp .env.example .env.local
   npx supabase status
   ```

   Copy the local API URL, anonymous key, and service-role key from the status
   output into `.env.local`. Never expose the service-role key to client code.

4. Start the development server.

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). Supabase Studio is
available at [http://127.0.0.1:54323](http://127.0.0.1:54323).

The first embedding request downloads the model and requires internet access.

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Browser-safe anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Embedding and privileged database operations |

Use [.env.example](.env.example) as the template. `.env.local` is ignored by
Git and must never be committed.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Turbopack development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Validate TypeScript without emitting files |
| `npm run build` | Create an optimized production build |
| `npm run check` | Run lint, type checking, and the production build |
| `node scripts/seed-dev.mjs` | Add local mentor profiles and embeddings |
| `node scripts/eval/run-eval.mjs` | Reproduce the matching evaluation |

## Verification

Run the complete application check:

```bash
npm run check
```

With local Supabase running, execute the database access-control tests:

```bash
docker exec -i supabase_db_alumniconnect psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/rls_tests.sql
```

## Project structure

```text
app/
  (auth)/          Registration and sign-in
  (dashboard)/     Profiles, discovery, requests, and administration
  (marketing)/     Public landing page
  api/             Embedding and matching endpoints
components/        Reusable interface, animation, and visual components
docs/              Evaluation methodology and project documentation
lib/               Supabase clients, embeddings, and shared utilities
scripts/           Seed, evaluation, and pipeline tooling
supabase/
  migrations/      Versioned database schema and functions
  tests/           SQL access-control tests
```

## Security model

- Row-level security is enabled for application data.
- Staff roles cannot be selected during public registration.
- Profile embeddings can only be written with server credentials.
- Sensitive keys remain server-only and are excluded from version control.
- Authorization is enforced in database functions, not only in the interface.

Please review [SECURITY.md](SECURITY.md) before reporting a vulnerability.

## Contributing

Contributions and constructive feedback are welcome. Read
[CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and pull
request checklist.

## Project status

AlumniConnect is an actively developed academic capstone and portfolio project.
It is suitable for local evaluation and continued development; production
deployment requires hosted Supabase configuration, operational monitoring, and
an institution-specific privacy review.

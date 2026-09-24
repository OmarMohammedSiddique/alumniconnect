# Contributing to AlumniConnect

Thank you for helping improve AlumniConnect. Contributions should be focused,
reviewable, and consistent with the project's security model.

## Development workflow

1. Create a branch from the latest default branch.
2. Install dependencies with `npm ci`.
3. Start Docker Desktop and run `npx supabase start` when database features are
   involved.
4. Copy `.env.example` to `.env.local` and add the local Supabase credentials.
5. Make a focused change with clear commit messages.
6. Run `npm run check` before opening a pull request.

## Database changes

- Add schema changes as a new file in `supabase/migrations`.
- Do not edit an existing migration after it has been shared.
- Preserve row-level security and test authorization boundaries.
- Never place service-role credentials in browser code or public variables.

Run the SQL security suite after database or policy changes:

```bash
docker exec -i supabase_db_alumniconnect psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/rls_tests.sql
```

## Pull requests

A pull request should:

- Explain the problem and the chosen solution.
- Stay limited to one coherent change.
- Include screenshots for visible interface changes.
- Include migrations or tests when behavior or data access changes.
- Pass lint, type checking, and the production build.
- Avoid committing `.env.local`, credentials, generated output, or editor files.

By contributing, you agree to follow the project's security and review
practices.

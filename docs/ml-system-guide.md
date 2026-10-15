# AlumniConnect ML system guide

Assessment question: "Show me where machine learning is implemented in AlumniConnect, demonstrate the complete workflow, and explain what every stage does."

## What the system does

AlumniConnect uses a pretrained sentence embedding model at inference time. Profile fields become text, the model converts that text to a 384-value vector, and PostgreSQL with pgvector ranks visible mentors by cosine distance from the signed-in user's vector. Exact shared skills are returned as a separate explanation. The default Discover view displays those matches. No AlumniConnect code updates the model's weights.

The live route requires authentication and a working Supabase project. The local `npm run ml:walkthrough` command demonstrates the same text builder and embedding function plus cosine ranking without Supabase. Its scores are illustrative and are not evidence of mentor suitability.

## File-by-file pipeline

Read the arrows as data flow, not as a single synchronous transaction. In particular, the browser starts embedding only **after** the profile save succeeds. A successful row save can therefore be followed by an embedding failure.

`app/(dashboard)/profile/profile-form.tsx` `ProfileForm` -> `app/(dashboard)/profile/actions.ts` `updateProfile` -> `public.profiles` row in `supabase/migrations/20260705000001_initial_schema.sql` -> `app/api/embed/route.ts` `POST` -> `lib/embedding/embed.ts` `buildProfileEmbeddingText` -> `getExtractor` and `generateEmbedding` using `Xenova/all-MiniLM-L6-v2` -> mean pooling and L2 normalization -> 384 values -> `public.profiles.embedding extensions.vector(384)` -> `app/api/match/route.ts` `POST` -> `public.match_mentors` in `supabase/migrations/20260705000002_match_explainability.sql` -> `1 - (embedding <=> query_embedding)` and distance ordering -> `similarity` plus exact `shared_skills` -> `app/(dashboard)/discover/discover-client.tsx` `DiscoverClient` -> `app/(dashboard)/discover/mentor-card.tsx` `MentorCard`.

| Stage and exact file | Function, route, SQL object, or component | Input -> output | Why it exists | What can fail | Demonstration evidence |
|---|---|---|---|---|---|
| Form: `app/(dashboard)/profile/profile-form.tsx` | `ProfileForm`, `useActionState(updateProfile)` and its save-success `useEffect` | Entered name, headline, bio, skills, industry, year -> form submission, then `POST /api/embed` | Collects the fields and starts vector refresh after save | Invalid or sparse fields, save error, browser request failure; a saved row may still have an old or null vector | Show the form fields, `form action`, and the effect that calls `/api/embed`; show its running/done/failed status text |
| Row write: `app/(dashboard)/profile/actions.ts` | `updateProfile` server action | Authenticated user and `FormData` -> updated `profiles` row or error | Validates and persists the profile before embedding | Missing login, invalid name/year/length, Supabase update error | Show the `.from("profiles").update(...).eq("id", user.id)` call and `saved: true` return |
| Profile storage: `supabase/migrations/20260705000001_initial_schema.sql` | `public.profiles`, `public.handle_new_user`, RLS policies | New auth user or validated profile update -> one profile row | Stores source fields and creates a row at signup | Signup trigger or RLS/column protection can reject writes | Show the table fields, signup trigger, and own-profile update policy; no live database access is needed for the code tour |
| Embedding API: `app/api/embed/route.ts` | `POST` | Signed-in user ID -> selected profile fields, then `{ ok: true, dimensions: 384 }` on success | Keeps embedding generation and privileged vector writes on the server | 401 if unauthenticated, 404 if row missing, 422 if no embeddable text, 500 on storage error; model load/inference can also fail | Point to `auth.getUser`, profile `.select`, `buildProfileEmbeddingText`, `generateEmbedding`, and admin `.update` |
| Text construction: `lib/embedding/embed.ts` | `buildProfileEmbeddingText` | Headline, bio, skills, industry, year -> newline-separated text | Gives the model one consistent text input using available structured fields | Sparse fields give little signal; long input may be truncated by the model tokenizer | Show the exact field order and the `Skills:`, `Industry:`, `Graduated:` labels; compare with walkthrough text preview |
| Frozen model inference: `lib/embedding/embed.ts` | `getExtractor`, `generateEmbedding` | Profile text -> token-level model output | Loads `Xenova/all-MiniLM-L6-v2` with `dtype: "q8"` once per server process and reuses it | Model download/cache, runtime, memory, or tokenizer failure; very long text may be truncated | Show `MODEL_ID`, cached `extractorPromise`, and `pipeline("feature-extraction", ...)`; the walkthrough invokes this exact function |
| Pooling and normalization: `lib/embedding/embed.ts` | `extractor(text, { pooling: "mean", normalize: true })` | Token representations -> one L2-normalized sentence vector | Mean pooling combines non-padding token representations; normalization makes vector magnitude approximately 1 so angle-based comparison is easy | Unexpected nonfinite output or wrong shape; pooling may lose detail and truncation discards tail content | Show the two options, then point to 384 dimensions and near-1 vector norms in the walkthrough |
| Vector storage: `app/api/embed/route.ts`; `supabase/migrations/20260705000001_initial_schema.sql` | Admin update of `embedding`; `extensions.vector(384)`; `protect_profile_columns`; `profiles_embedding_idx` | 384 numbers serialized as a pgvector-compatible array -> stored vector in the same row | Saves the representation for later matching and enforces server-only vector writes | Dimension mismatch, service role configuration, database error, or an unsynced row after API failure | Show `JSON.stringify(embedding)`, `vector(384)`, service-role guard, and cosine index declaration |
| Match API: `app/api/match/route.ts` | `POST` | Signed-in user and optional `count` -> `{ matches }` | Uses the stored query vector to ask PostgreSQL for ranked mentors | 401 without login, 422 without a query embedding, 500 on RPC error; returns no matches when no eligible mentors exist | Show `.select("embedding")` and `.rpc("match_mentors", ...)`; note a successful profile save alone does not guarantee an embedding |
| Ranking: `supabase/migrations/20260705000002_match_explainability.sql` (replaces initial function in `...000001_initial_schema.sql`) | `public.match_mentors` | Query `vector(384)`, count -> visible, embedded mentors ordered by `<=>` | Cosine distance ranks vectors; `1 - distance` is reported as similarity | No visible mentors with embeddings, unavailable RPC, index recall limitations when IVFFlat is used | Show mentor/visibility/non-null filters, `order by p.embedding <=> query_embedding`, `limit least(match_count, 50)`, and the similarity expression |
| Explanation: `supabase/migrations/20260705000002_match_explainability.sql` | `caller` CTE and `shared_skills` expression | Caller skills and mentor skills -> case-insensitive exact overlap array | Gives an inspectable field-level explanation alongside semantic score | Empty caller skills or different spelling gives an empty overlap even when vectors are close; score is not a causal explanation | Show `lower(cs) = lower(ps)` and returned `similarity`, `shared_skills` columns |
| Discover: `app/(dashboard)/discover/discover-client.tsx`; `app/(dashboard)/discover/mentor-card.tsx` | `DiscoverClient`, `MentorCard` | `/api/match` JSON -> ranked cards with score badge and highlighted shared skills | Makes recommendations and explanations visible; separate keyword mode calls `search_mentors` | API error notice, empty list, stale embedding, or misleading interpretation of badge | Show the default `semantic` mode, fetch with `count: 12`, `Math.round(similarity * 100)` badge, and shared skill highlighting |

The card's `% match` badge is cosine similarity multiplied by 100 and rounded. It is **not** a calibrated probability that mentoring will succeed. The case-insensitive skill overlap is an exact-field explanation, not an explanation of which words caused the model score. The `ivfflat` index is approximate-nearest-neighbor infrastructure; it can trade recall for speed. [pgvector documentation](https://github.com/pgvector/pgvector/blob/master/README.md).

## What is learned, and when

1. **Original creators' training:** the model card says its creators started from a pretrained MiniLM model and further trained the sentence embedding model with a contrastive objective over sentence pairs. AlumniConnect did not perform either stage. [Original model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2).
2. **Current AlumniConnect inference:** `lib/embedding/embed.ts` loads the ONNX-compatible `Xenova/all-MiniLM-L6-v2` weights at `q8` precision and runs feature extraction. The weights stay frozen. [ONNX model card](https://huggingface.co/Xenova/all-MiniLM-L6-v2).
3. **Possible future fine-tuning:** starting from pretrained weights, a training run would update them using suitable, human-reviewed mentor matching examples and a chosen loss. There is no such run in this repository. [Sentence Transformers training overview](https://sbert.net/docs/sentence_transformer/training_overview.html).
4. **Training from random initialization:** learning the model parameters from scratch would be a separate, much larger project. AlumniConnect does not do it.
5. **Adding a profile:** saving fields and calculating a new vector adds data to PostgreSQL. It does not update model weights or teach the model from the new person's profile.

An embedding is a dense numeric representation of input text. The **384 values** are the output width of this model, not 384 profile features learned by AlumniConnect; the database column is declared `vector(384)` to match. The user's `full_name` is stored in the row but is not included in `buildProfileEmbeddingText`. Mean pooling averages the model's token representations while respecting the attention mask, producing one fixed-length representation; L2 normalization divides by vector length so its norm is near 1. The original model card shows the pooling and normalization procedure and warns that inputs longer than its default 256 word pieces are truncated. Long bios may therefore lose information toward the end. [Original model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), [Transformers.js feature extraction example](https://huggingface.co/docs/transformers.js/api/pipelines).

Cosine similarity is the normalized dot product. pgvector's `<=>` returns cosine **distance**, and the RPC reports `1 - distance` as similarity while sorting by ascending distance. A larger score means closer vector directions for these texts, not a verified good mentorship pairing. [pgvector distance operators](https://github.com/pgvector/pgvector/blob/master/README.md).

## Five-minute demonstration route

Prepare a local checkout with dependencies installed and a Node version that supports native TypeScript stripping (verified here with Node 26.8.2). The package's general `node >=20.9.0` engine declaration does not guarantee this demonstration command will run on every older Node release. The first model run may need to fetch the existing pretrained files from Hugging Face; subsequent cached runs are quicker. No `.env` or Supabase instance is needed for the command.

1. **0:00 to 0:45:** Open `app/(dashboard)/profile/profile-form.tsx`, then `app/(dashboard)/profile/actions.ts`, then `supabase/migrations/20260705000001_initial_schema.sql`. Point to the save-success effect, row update, and `profiles` table. Say: "The form saves profile fields first. A successful save starts a separate embedding request, so a vector can lag behind the row."
2. **0:45 to 1:45:** Open `app/api/embed/route.ts`, then `lib/embedding/embed.ts`. Point to the authenticated lookup, `buildProfileEmbeddingText`, `MODEL_ID`, `pooling: "mean"`, `normalize: true`, and admin vector update. Say: "This is frozen pretrained inference. Profile text becomes a normalized 384-value vector; storing it does not train the model."
3. **1:45 to 2:45:** Run `npm run ml:walkthrough` from the repository root. Point to the printed profile texts, each `embedding dimensions: 384`, each `L2 norm` near `1`, the cosine similarities, and the ranked mentor list. Say: "The related example uses different vocabulary. These are text similarities, not assessed mentor quality; the ranking may vary slightly with model runtime."
4. **2:45 to 3:45:** Open `app/api/match/route.ts`, then `supabase/migrations/20260705000002_match_explainability.sql`. Point to the 422 guard, RPC call, visibility filters, `<=>` ordering, `1 -` score, and `shared_skills`. Say: "Postgres filters eligible mentors, ranks by cosine distance, and returns an exact skill overlap separately."
5. **3:45 to 4:20:** Open `app/(dashboard)/discover/discover-client.tsx`, then `app/(dashboard)/discover/mentor-card.tsx`. Point to default Recommended fetch and the score and skill display. Say: "The UI shows the database ranking. The badge is a scaled cosine score, not a probability. Keyword search is a separate mode."
6. **4:20 to 5:00:** Open `scripts/eval/dataset.mjs`, `scripts/eval/run-eval.mjs`, and `docs/eval-results.md`. Point to seeded domain labels, four conditions, and the all-mentee P@1 row. Say: "On this synthetic same-domain task, semantic-full scored 0.833 at P@1 and keyword plus category scored 0.917. This does not prove real mentor suitability or semantic superiority."

Do not run `scripts/eval/run-eval.mjs` for this demonstration: it creates and removes evaluation users through a Supabase admin client. The local walkthrough is the safe executable portion. To show the entire deployed path later, use an authorized isolated account and database and inspect a saved profile, `/api/embed` response, `/api/match` response, and Discover cards; that end-to-end test is not performed by this guide.

## Evaluation evidence and limits

`scripts/eval/dataset.mjs` deterministically generates 40 synthetic mentors across eight domains and 24 synthetic mentees. A pair counts as relevant when the generator assigned the same domain to both, not when a human judged the mentor suitable. `scripts/eval/run-eval.mjs` embeds profiles and compares `semantic-full`, `semantic-minimal` (headline and skills), `keyword+category` (skill terms plus industry), and `keyword-skills-only`. It reports Precision@1/3/5, mean reciprocal rank (MRR), and coverage in `docs/eval-results.md`. P@k is the fraction of relevant returned mentors in the first k positions; MRR rewards finding the first relevant mentor early; coverage records whether a query has a scoreable result. The script excludes unlabelled existing mentors from scoring, though they can remain in the candidate pool.

The strongest **overall** recorded result is `keyword+category`: P@1 **0.917** versus **0.833** for `semantic-full`, with both at 1.000 coverage over 24 synthetic queries. In the six vocabulary-mismatch queries, semantic-full has P@1 0.667 and coverage 1.000, while keyword-skills-only has P@1 0.000 and coverage 0.500. Category information still gives keyword+category P@1 0.833 there. This is a narrow demonstration of vocabulary mismatch, not proof that semantic matching generally wins. The category baseline benefits from an explicit industry cue that matches the synthetic domain label; the semantic representation must infer a similar relationship from text. [Recorded results](eval-results.md).

The evaluation is small, synthetic, English-oriented, and based on same-domain ground truth. It lacks human-reviewed suitability labels, raw per-query ranking evidence in the saved report, uncertainty estimates, and an independent real-user study. The code's metric handling and candidate filtering still need an independently verified protocol before treating the numbers as final research claims. The `semantic-minimal` condition is a sparse-text simulation, not a measured signup-to-first-match journey. The local walkthrough tests vector shape, numeric sanity, and illustrative ranking only; it does not reproduce these aggregate evaluation numbers.

## Synthetic-data decision

- **What the existing set tests:** whether the current model and the keyword baselines retrieve same-domain synthetic mentors under controlled profile wording, including a small vocabulary-mismatch subset. It also illustrates a sparse-text condition.
- **Why labels are limited:** two people can share a domain but differ in goals, availability, experience, communication, location, or preferences. Same-domain labels do not establish mentor suitability, and synthetic profiles are not real-user evidence.
- **More synthetic data now:** no. More examples generated from the same templates and labels would increase count without fixing ground-truth validity. Preserve the current set for a reproducible illustration while resolving the evaluation protocol.
- **If fine-tuning is approved later:** collect consented or carefully curated real mentor/mentee profiles or de-identified text, pairwise or graded relevance judgments from a clear rubric, realistic hard negatives from the same domain, and enough independent people for train, validation, and held-out test groups. Decide the intended outcome and privacy handling with the supervisor before collection. Fine-tuning would update pretrained weights toward project-specific relevance; it would require a fresh, independent comparison with the current frozen model and both baselines.
- **Proposed record schema, not a dataset generated here:**

  | Field | Meaning |
  |---|---|
  | `anchor` | Mentee profile or goal text plus a stable, privacy-safe person ID |
  | `positive` | Mentor profile judged suitable, with mentor person ID |
  | `hard_negative` | Plausible but unsuitable mentor, ideally sharing a domain, with person ID |
  | `relevance_score` | Ordinal or numeric suitability judgment using a written rubric |
  | `rationale` | Short explanation of the judgment, including key constraints |
  | `provenance` | Source, consent/license status, annotator role, and review date |
  | `split` | `train`, `validation`, or `test` group assignment |

- **Split and review:** keep each person's profile and all pairs involving that person in only one split; otherwise near-identical text leaks across training and evaluation and inflates results. Have trained human reviewers confirm final relevance labels, especially disagreements and hard negatives, before reporting performance. Follow the approved privacy and ethics process.
- **Decision gate:** do not start new training or synthetic generation until Issue #1, the final ML training requirement, is resolved with the supervisor.

## Oral-defense questions

| Question | Short accurate answer |
|---|---|
| Where is the ML? | `lib/embedding/embed.ts` runs the pretrained model; `/api/embed` stores its output; `match_mentors` compares vectors. |
| What is an embedding? | A dense numerical representation of text that lets the system compare profile meaning approximately. |
| Why are there 384 values? | That is this model's output width; `vector(384)` enforces the same width in PostgreSQL. |
| What does mean pooling do? | It averages non-padding token representations into one fixed-length text vector. |
| Why normalize the vector? | It makes the L2 norm near 1, so cosine comparison depends on direction instead of length. |
| How is cosine similarity used? | pgvector orders by cosine distance `<=>`; the RPC reports `1 - distance` as similarity. |
| Does adding a profile train the model? | No. It creates or refreshes a stored vector using frozen weights. |
| What exactly was evaluated? | Same-domain retrieval for 24 synthetic mentees against 40 synthetic mentors under four matching conditions, with P@1/3/5, MRR, and coverage. |
| What is the strongest current result? | Overall P@1 is 0.917 for keyword+category versus 0.833 for semantic-full on the recorded synthetic set. |
| What are the limitations? | Domain labels are not suitability judgments; the set is small and synthetic, and real-user performance and cold-start success remain unmeasured. |
| What would fine-tuning change? | It would update pretrained model weights to better reflect an approved, labeled mentorship relevance task. |
| What data would fine-tuning require? | Human-reviewed suitable and unsuitable mentor pairs or graded scores, provenance, and person-separated train/validation/test splits. |
| Why does keyword plus category currently perform better overall? | Its industry cue directly helps recover the synthetic same-domain label; the current semantic model was not tuned for this mentorship task. This is a likely explanation of the measured result, not a proven causal finding. |

## Where to look during a viva

| Likely supervisor question | Repository file to open | External primary source to open |
|---|---|---|
| Where does profile data enter and persist? | `app/(dashboard)/profile/profile-form.tsx`, `app/(dashboard)/profile/actions.ts`, `supabase/migrations/20260705000001_initial_schema.sql` | [Next.js Route Handler guide](https://nextjs.org/docs/app/getting-started/route-handlers) for the API boundary |
| Which model and why 384 dimensions? | `lib/embedding/embed.ts`, `supabase/migrations/20260705000001_initial_schema.sql` | [Original all-MiniLM-L6-v2 model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), [Xenova ONNX model card](https://huggingface.co/Xenova/all-MiniLM-L6-v2) |
| What are pooling, normalization, and truncation? | `lib/embedding/embed.ts`, `scripts/ml-walkthrough.mjs` | [Original model card with pooling code and input limit](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), [Transformers.js pipeline docs](https://huggingface.co/docs/transformers.js/api/pipelines) |
| How are vectors stored and ranked? | `app/api/embed/route.ts`, `app/api/match/route.ts`, `supabase/migrations/20260705000001_initial_schema.sql`, `supabase/migrations/20260705000002_match_explainability.sql` | [pgvector cosine-distance and index documentation](https://github.com/pgvector/pgvector/blob/master/README.md) |
| Is the displayed score an explanation or probability? | `supabase/migrations/20260705000002_match_explainability.sql`, `app/(dashboard)/discover/mentor-card.tsx` | [pgvector cosine similarity expression](https://github.com/pgvector/pgvector/blob/master/README.md) |
| Was the model trained here; what would fine-tuning need? | `lib/embedding/embed.ts`, `scripts/eval/dataset.mjs` | [Original model training history](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), [Sentence Transformers training overview](https://sbert.net/docs/sentence_transformer/training_overview.html) |
| What evidence supports matching quality? | `scripts/eval/run-eval.mjs`, `docs/eval-results.md`, `docs/project-checklist.md` | [Sentence Transformers evaluator guidance](https://sbert.net/docs/sentence_transformer/training_overview.html) |

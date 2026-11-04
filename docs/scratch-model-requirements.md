# Confirmed Scratch-Training and Live-Model Acceptance Requirements

**Date Recorded:** 4 November 2026  
**Status:** Approved Requirements Specification  
**Associated Issues:** #1 (Requirements & Decision), #25 (Training Protocol), #26 (Live-Model Integration Contract), #27 (Knowledge Graph Scope), #3 (Evaluation Framework), #30 (Sprint Review)

---

## 1. Context and Origin of Requirement

The AlumniConnect capstone project was initially scaffolded with a pretrained sentence embedding pipeline (`Xenova/all-MiniLM-L6-v2`) in `lib/embedding/embed.ts`. While this demonstrated end-to-end vector retrieval with PostgreSQL and `pgvector`, academic capstone requirements mandate that machine learning competency must be demonstrated through **training a model from scratch**.

On 4 November 2026, the student formally confirmed the following core requirements:
1. **Training from scratch is an academic requirement:** The project cannot rely exclusively on fine-tuning or off-the-shelf pretrained language model weights.
2. **The final live application must use the scratch-trained model:** The web platform must be integrated with the selected trained model artifact for live alumni mentor discovery, replacing or complementing the pretrained fallback.
3. **Integrity and defensibility:** Baselines, training dynamics, convergence, and evaluation metrics must be documented with complete empirical honesty, without fabricating performance improvements over mature commercial models.

---

## 2. Definitive Definition of "Scratch Training"

To satisfy academic assessment rigor, "training from scratch" is defined strictly:

### 2.1 Prohibited Elements
- **No pretrained weights:** No layers, backbones, or checkpoint weights initialized from pretrained language models (e.g., BERT, RoBERTa, DistilBERT, MiniLM, GPT, or GloVe embeddings).
- **No warm-started transfer learning:** Models cannot be warm-started with off-the-shelf checkpoints and re-labelled as "trained from scratch."
- **No teacher-distillation with frozen proprietary APIs:** Training data cannot rely exclusively on black-box external proprietary embeddings without inspectable local supervision.

### 2.2 Permitted Elements
- **Random Weight Initialization:** All model parameters must be initialized from known probability distributions (e.g., Xavier/Glorot uniform or normal, Kaiming/He normal initialization) using standard framework calls (`torch.nn.init`).
- **Standard ML Frameworks & Libraries:** Standard open-source frameworks (PyTorch, NumPy, scikit-learn for baselines, Hugging Face Tokenizers for training custom tokenizers from scratch).
- **Custom Tokenization:** Character-level tokenizers, byte-pair encoding (BPE), or WordPiece tokenizers trained exclusively from the project's corpus or domain dictionary, without pretrained vocabulary distributions.
- **Architectures:** Convolutional sentence encoders (e.g., Character-CNN), Recurrent / BiLSTM encoders, or shallow Transformer encoder blocks trained from random initialization.

---

## 3. Live-Model Integration Contract (#26)

The trained model must interface with the AlumniConnect Next.js / Supabase application via a strict deployment contract:

1. **Artifact Format:** The trained PyTorch model must be exported to Open Neural Network Exchange (`.onnx`) format with fixed or dynamic batch dimensions and explicit input/output tensor signatures.
2. **Output Embedding Dimensionality ($D$):**
   - The pilot pipeline produces $D = 64$ dimensions.
   - The final production scratch architecture targets $D \in \{64, 128, 384\}$.
   - The Supabase database schema (`profiles.embedding`) must declare `vector(D)` matching the active model dimensionality, with pgvector IVFFlat or HNSW indexing.
3. **Execution Runtime:**
   - In-process inference using `@huggingface/transformers` or `onnxruntime-node` inside Next.js API routes (`app/api/embed/route.ts`).
   - Server-side execution under rate-limiting and deduplication guards (implemented in #21).
4. **Verification Gate for Release:**
   - Proof of active scratch model execution will be established via:
     - Checkpoint SHA-256 fingerprint matching in release documentation.
     - Dimension matching between model output and `pgvector` column.
     - Integration smoke tests confirming vector generation without contacting external Hugging Face hub repositories.

---

## 4. Training Data Boundaries and Privacy

To comply with the Kenya Data Protection Act (2019) and research ethics:

1. **No Unconsented Personal Data:** Real student or alumni profile data must never be used for training or public evaluation.
2. **Permitted Data Sources:**
   - **Synthetic Profile Corpus:** Generated profile descriptions and queries reflecting realistic aviation, engineering, logistics, and management careers, following the data generation schema in `ml/data/`.
   - **Open Professional Taxonomies:** Standard public skill and occupation classifications (e.g., O*NET, ESCO) used to structure skill co-occurrences and mentorship domains.
3. **Ground-Truth Relevance Dataset:**
   - A gold-standard test split containing at least 20–50 representative mentorship queries paired with candidate mentor profiles.
   - Scored using multi-graded relevance ($0 = \text{irrelevant}, 1 = \text{somewhat relevant}, 2 = \text{highly relevant}$) verified by human review.

---

## 5. Evaluation Framework and Baselines (#3)

Evaluation must measure ranking utility on genuine retrieval tasks rather than generic classification accuracy.

### 5.1 Primary Evaluation Metrics
- **NDCG@5 (Normalized Discounted Cumulative Gain at rank 5):** Measures ranking quality accounting for position-discounted graded relevance.
- **MRR@5 (Mean Reciprocal Rank at rank 5):** Evaluates how high the first relevant mentor appears.
- **Precision@5 (P@5):** Proportion of top 5 returned candidates that are relevant.

### 5.2 Mandatory Baselines
1. **Random Baseline:** Random vector assignment or random ranking to establish the lower-bound floor.
2. **TF-IDF + Cosine Distance:** Bag-of-words lexical baseline with n-grams using scikit-learn.
3. **BM25 / Keyword Search:** Lexical ranking baseline matching database full-text search.
4. **MiniLM Benchmark (Pretrained Upper Reference):** Frozen `all-MiniLM-L6-v2` evaluated under identical test queries to provide a known upper reference boundary for small models.

### 5.3 Acceptance Criteria for Model Selection
- The scratch-trained model must demonstrate measurable convergence (declining training/validation loss over epochs).
- The scratch model must outperform random ranking on NDCG@5 and MRR@5.
- Where small scratch architectures fail to surpass TF-IDF or large pretrained models on nuanced semantics, this finding must be recorded honestly in the dissertation as an empirical research finding rather than obscured.

---

## 6. Knowledge Graph Bounded Resolution (#27)

Earlier project notes mentioned a "knowledge graph" component. In accordance with issue #27:
- **Production Boundary:** A dedicated graph database (e.g. Neo4j) or Graph Neural Network (GNN) inference service is explicitly **out of scope** for the live Vercel/Supabase application.
- **Supported Graph Artifact:** The knowledge graph requirement is resolved as a **domain knowledge taxonomy**:
  - A structured bipartite graph of `(Alumni) —[:HAS_SKILL]—> (Skill) <—[:IN_DOMAIN]— (Industry)` and skill co-occurrence adjacency.
  - This taxonomy serves directly as the structured prior for contrastive pair sampling during scratch model training and for exact shared skill explanations in the UI.

---

## 7. Traceability and Action Plan

| Component | Responsibility / Artifact | Target Issue |
|---|---|---|
| Scratch Model Protocol & Data | `ml/train_scratch_pilot.py`, `ml/data/` | #25 |
| Rigorous Evaluation Matrix | `docs/eval-results.md`, test harness | #3 |
| Production ONNX Integration | `app/api/embed/route.ts`, schema update | #26 |
| Knowledge Graph Scoping | Documented in Section 6 | #27 |
| Sprint 4 Assessment Presentation | Presentation script & slides | #30 |

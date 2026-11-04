import assert from "node:assert/strict";
import test from "node:test";
import { EmbedGuard, computeEmbeddingKey } from "./embed-guard.ts";

test("computeEmbeddingKey produces deterministic SHA-256 fingerprints", () => {
  const text = "Data Engineer\nLooking for mentorship\nSkills: Python, SQL";
  const model = "Xenova/all-MiniLM-L6-v2";
  const key1 = computeEmbeddingKey(text, model);
  const key2 = computeEmbeddingKey(`  ${text}  \n`, model);
  assert.equal(key1, key2);
  assert.match(key1, /^[0-9a-f]{64}$/);

  // Different text or model yields different fingerprint
  assert.notEqual(key1, computeEmbeddingKey("Other text", model));
  assert.notEqual(key1, computeEmbeddingKey(text, "other-model"));
});

test("rate limiting enforces per-user threshold and isolates different users", () => {
  const guard = new EmbedGuard({ maxRequests: 3, windowMs: 10_000 });
  const userA = "user-a";
  const userB = "user-b";
  const now = 1_000_000;

  // User A consumes allowance
  assert.equal(guard.checkRateLimit(userA, now).allowed, true);
  assert.equal(guard.checkRateLimit(userA, now + 1000).allowed, true);
  assert.equal(guard.checkRateLimit(userA, now + 2000).allowed, true);

  // 4th request from User A is throttled with Retry-After
  const throttled = guard.checkRateLimit(userA, now + 3000);
  assert.equal(throttled.allowed, false);
  assert.equal(throttled.retryAfterSeconds, 7); // (1_000_000 + 10_000 - 1_003_000) / 1000

  // User B is unaffected (tenant isolation)
  assert.equal(guard.checkRateLimit(userB, now + 3000).allowed, true);

  // After window expiration, User A is allowed again
  const later = now + 11_000;
  assert.equal(guard.checkRateLimit(userA, later).allowed, true);
});

test("hasCachedEmbedding requires matching text hash, model, and profile timestamp", () => {
  const guard = new EmbedGuard();
  const userId = "user-123";
  const hash = "hash-abc";
  const model = "model-v1";
  const updatedAt = "2026-11-04T12:00:00Z";

  assert.equal(guard.hasCachedEmbedding(userId, hash, model, updatedAt), false);

  guard.recordSuccess(userId, hash, model, 384, updatedAt);
  assert.equal(guard.hasCachedEmbedding(userId, hash, model, updatedAt), true);

  // Unrelated user is false
  assert.equal(guard.hasCachedEmbedding("other-user", hash, model, updatedAt), false);

  // Newer profile edit invalidates cache
  assert.equal(guard.hasCachedEmbedding(userId, hash, model, "2026-11-04T12:05:00Z"), false);

  // Content change invalidates cache
  assert.equal(guard.hasCachedEmbedding(userId, "different-hash", model, updatedAt), false);

  // Model change invalidates cache
  assert.equal(guard.hasCachedEmbedding(userId, hash, "model-v2", updatedAt), false);
});

test("deduplicate shares a single in-flight promise across concurrent identical requests", async () => {
  const guard = new EmbedGuard();
  let executionCount = 0;
  let finishInference;
  const inferencePromise = new Promise((resolve) => {
    finishInference = resolve;
  });

  const task = async () => {
    executionCount++;
    return await inferencePromise;
  };

  // Three concurrent callers with the same key
  const call1 = guard.deduplicate("key-1", task);
  const call2 = guard.deduplicate("key-1", task);
  const call3 = guard.deduplicate("key-1", task);

  // Underlying task should have been invoked exactly once
  assert.equal(executionCount, 1);

  finishInference({ dimensions: 384, reused: false });
  const [res1, res2, res3] = await Promise.all([call1, call2, call3]);

  assert.deepEqual(res1, { dimensions: 384, reused: false });
  assert.equal(res2, res1);
  assert.equal(res3, res1);

  // After completion, the key is removed so a subsequent call runs a new task
  let nextCount = 0;
  await guard.deduplicate("key-1", async () => {
    nextCount++;
    return { dimensions: 384, reused: false };
  });
  assert.equal(nextCount, 1);
});

test("failed deduplicated task cleans up the in-flight key so retries can proceed", async () => {
  const guard = new EmbedGuard();
  let attempts = 0;

  const failingTask = async () => {
    attempts++;
    throw new Error("Model inference temporary timeout");
  };

  await assert.rejects(
    async () => {
      await Promise.all([
        guard.deduplicate("fail-key", failingTask),
        guard.deduplicate("fail-key", failingTask),
      ]);
    },
    { message: "Model inference temporary timeout" },
  );

  assert.equal(attempts, 1);

  // Subsequent retry succeeds and is not blocked by a poisoned promise
  const recovery = await guard.deduplicate("fail-key", async () => {
    attempts++;
    return { dimensions: 384, reused: false };
  });
  assert.equal(recovery.dimensions, 384);
  assert.equal(attempts, 2);
});

test("prune removes expired rate limit records", () => {
  const guard = new EmbedGuard({ maxRequests: 2, windowMs: 5000 });
  guard.checkRateLimit("user-old", 1000);
  guard.checkRateLimit("user-new", 8000);

  guard.prune(9000); // 9000 - 5000 = 4000 cutoff
  // user-old (1000) was pruned; user-new (8000) remains
  assert.equal(guard.checkRateLimit("user-old", 9001).allowed, true);
});

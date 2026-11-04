import { createHash } from "node:crypto";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface EmbedGuardConfig {
  /** Maximum requests allowed in the sliding window. Defaults to 6. */
  maxRequests?: number;
  /** Duration of the sliding window in milliseconds. Defaults to 60_000 (1 minute). */
  windowMs?: number;
}

interface InFlightEntry {
  promise: Promise<{ dimensions: number; reused: boolean }>;
}

interface UserRateLimitState {
  timestamps: number[];
}

interface UserEmbeddingCache {
  textHash: string;
  modelId: string;
  dimensions: number;
  profileUpdatedAt: string;
}

/**
 * Computes a deterministic SHA-256 fingerprint for the effective profile text
 * and model configuration. Any change to the text or model invalidates reuse.
 */
export function computeEmbeddingKey(text: string, modelId: string): string {
  return createHash("sha256")
    .update(`${modelId}\n${text.trim()}`)
    .digest("hex");
}

/**
 * EmbedGuard provides:
 * 1. Per-user sliding-window rate limiting (returns HTTP 429 Retry-After).
 * 2. In-flight request deduplication so concurrent identical calls share a single inference.
 * 3. Unchanged-content reuse caching: skips inference if the profile text is unchanged.
 * 4. Optimistic snapshot verification: prevents slow older runs from overwriting newer edits.
 */
export class EmbedGuard {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly rateLimits = new Map<string, UserRateLimitState>();
  private readonly inFlight = new Map<string, InFlightEntry>();
  private readonly cachedSuccess = new Map<string, UserEmbeddingCache>();

  constructor(config: EmbedGuardConfig = {}) {
    this.maxRequests = config.maxRequests ?? 6;
    this.windowMs = config.windowMs ?? 60_000;
  }

  /**
   * Checks whether the user is within rate limits.
   * Uses authenticated user ID to isolate tenants completely.
   */
  checkRateLimit(userId: string, now: number = Date.now()): RateLimitResult {
    const state = this.rateLimits.get(userId) ?? { timestamps: [] };
    // Evict timestamps outside the sliding window
    const windowStart = now - this.windowMs;
    const active = state.timestamps.filter((ts) => ts > windowStart);
    state.timestamps = active;
    this.rateLimits.set(userId, state);

    if (active.length >= this.maxRequests) {
      const oldestActive = active[0];
      const resetTime = oldestActive + this.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    state.timestamps.push(now);
    return { allowed: true };
  }

  /**
   * Checks if a completed embedding already exists for this exact text and model
   * for this user's current profile snapshot.
   */
  hasCachedEmbedding(
    userId: string,
    textHash: string,
    modelId: string,
    profileUpdatedAt: string,
  ): boolean {
    const cached = this.cachedSuccess.get(userId);
    if (!cached) return false;
    return (
      cached.textHash === textHash &&
      cached.modelId === modelId &&
      cached.profileUpdatedAt === profileUpdatedAt
    );
  }

  /**
   * Runs the inference task with in-flight deduplication. If another identical
   * task is already running for the same user and text key, it returns that
   * existing promise instead of spawning duplicate computation.
   */
  async deduplicate<T extends { dimensions: number; reused: boolean }>(
    dedupeKey: string,
    task: () => Promise<T>,
  ): Promise<T> {
    const existing = this.inFlight.get(dedupeKey);
    if (existing) {
      return (await existing.promise) as T;
    }

    const promise = task().finally(() => {
      this.inFlight.delete(dedupeKey);
    });

    this.inFlight.set(dedupeKey, { promise });
    return (await promise) as T;
  }

  /**
   * Records a successful embedding persistence in the reuse cache.
   */
  recordSuccess(
    userId: string,
    textHash: string,
    modelId: string,
    dimensions: number,
    profileUpdatedAt: string,
  ): void {
    this.cachedSuccess.set(userId, {
      textHash,
      modelId,
      dimensions,
      profileUpdatedAt,
    });
  }

  /**
   * Evicts expired rate-limit records to prevent memory growth.
   */
  prune(now: number = Date.now()): void {
    const windowStart = now - this.windowMs;
    for (const [userId, state] of this.rateLimits.entries()) {
      state.timestamps = state.timestamps.filter((ts) => ts > windowStart);
      if (state.timestamps.length === 0) {
        this.rateLimits.delete(userId);
      }
    }
  }

  /** Clears all internal caches (for test isolation). */
  reset(): void {
    this.rateLimits.clear();
    this.inFlight.clear();
    this.cachedSuccess.clear();
  }
}

// Global instance reused across requests within the server runtime.
export const defaultEmbedGuard = new EmbedGuard();

/**
 * retryQueue.ts
 * ──────────────
 * Generic retry logic with exponential backoff.
 * Used for Firestore operations that may fail due to network issues.
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
};

export class RetryError extends Error {
  constructor(
    public originalError: Error,
    public attemptCount: number,
  ) {
    super(`Failed after ${attemptCount} attempts: ${originalError.message}`);
    this.name = 'RetryError';
  }
}

/**
 * Retry an async operation with exponential backoff.
 * Throws RetryError if all attempts fail.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delayMs = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on auth errors or permission denied
      if (
        lastError.message.includes('permission-denied') ||
        lastError.message.includes('auth/')
      ) {
        throw lastError;
      }

      if (attempt < opts.maxAttempts) {
        console.warn(`Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delayMs}ms`, lastError.message);
        await sleep(delayMs);
        delayMs = Math.min(delayMs * opts.backoffMultiplier, opts.maxDelayMs);
      }
    }
  }

  throw new RetryError(lastError || new Error('Unknown error'), opts.maxAttempts);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is likely network-related (retryable).
 */
export function isRetryableError(error: unknown): boolean {
  const err = error instanceof Error ? error.message : String(error);
  const retryablePatterns = [
    'network',
    'timeout',
    'unavailable',
    'service-unavailable',
    'deadline-exceeded',
    'internal',
  ];
  return retryablePatterns.some(p => err.toLowerCase().includes(p));
}

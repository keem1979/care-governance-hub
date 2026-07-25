type AttemptWindow = { count: number; resetAt: number };

const attempts = new Map<string, AttemptWindow>();

export function consumeLoginAttempt(
  key: string,
  options: { maxAttempts: number; windowMs: number; now?: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = options.now ?? Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= options.maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearLoginAttempts(key: string): void {
  attempts.delete(key);
}

export function resetRateLimitForTests(): void {
  attempts.clear();
}

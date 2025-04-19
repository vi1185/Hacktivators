interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }>;
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.store = new Map();
    this.config = config;
  }

  async check(identifier: string): Promise<boolean> {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now > entry.resetTime) {
      // Reset or create new entry
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }

    if (entry.count >= this.config.maxRequests) {
      return false;
    }

    // Increment count
    entry.count++;
    return true;
  }

  // Clean up expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }
} 
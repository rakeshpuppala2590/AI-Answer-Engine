// src/services/cache/ScrapeCache.ts
import { CacheEntry, ICache } from "./types";

export class ScrapeCache implements ICache {
  private cache: Map<string, CacheEntry>;
  private ttl: number;

  constructor(ttlMinutes: number = 60) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000;
  }

  set(key: string, value: string): void {
    this.cache.set(key, {
      content: value,
      timestamp: Date.now(),
    });
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.content;
  }
}

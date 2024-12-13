// src/services/cache/types.ts
export interface CacheEntry {
  content: string;
  timestamp: number;
}

export interface ICache {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

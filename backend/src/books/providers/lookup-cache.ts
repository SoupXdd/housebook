import { Injectable, Logger } from '@nestjs/common';
import type { BookLookupResult } from '../types';

@Injectable()
export class LookupCache {
  private readonly logger = new Logger(LookupCache.name);
  private readonly ttlMs = 5 * 60 * 1000;
  private readonly store = new Map<
    string,
    { expiresAt: number; data: BookLookupResult }
  >();

  get(key: string): BookLookupResult | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit: ${key}`);
    return entry.data;
  }

  set(key: string, data: BookLookupResult): void {
    this.logger.debug(`Cache set: ${key}`);
    this.store.set(key, { expiresAt: Date.now() + this.ttlMs, data });
  }

  setMany(keys: string[], data: BookLookupResult): void {
    for (const key of keys) {
      this.set(key, data);
    }
  }

  get size(): number {
    return this.store.size;
  }
}

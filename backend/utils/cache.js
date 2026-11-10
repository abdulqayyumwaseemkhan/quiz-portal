/**
 * Lightweight in-memory TTL cache for serverless hot-path queries
 * (e.g. active quiz metadata and question sets when 100 students start simultaneously).
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = 15000) {
    if (this.store.size > 500) {
      // Evict oldest key to bound memory in warm serverless containers
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

   invalidate(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

module.exports = new MemoryCache();

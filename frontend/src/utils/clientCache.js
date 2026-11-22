/**
 * In-Memory Client-Side Cache with Stale-While-Revalidate (SWR) support.
 *
 * Keeps page data instantly available when navigating between tabs and pages (0ms latency),
 * while allowing silent background revalidation without disruptive loading skeletons.
 */

const memoryCache = new Map();

export const clientCache = {
  /**
   * Retrieve cached data by key
   */
  get(key) {
    if (!key || !memoryCache.has(key)) return null;
    const item = memoryCache.get(key);
    if (item.expiresAt && Date.now() > item.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return item.data;
  },

  /**
   * Save data into cache with a TTL (default 10 minutes)
   */
  set(key, data, ttlMs = 10 * 60 * 1000) {
    if (!key) return;
    memoryCache.set(key, {
      data,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null,
      savedAt: Date.now(),
    });
  },

  /**
   * Check if valid cached data exists
   */
  has(key) {
    return this.get(key) !== null;
  },

  /**
   * Invalidate specific key or prefix pattern
   */
  invalidate(keyPattern) {
    if (!keyPattern) {
      memoryCache.clear();
      return;
    }
    for (const key of memoryCache.keys()) {
      if (typeof keyPattern === 'string') {
        if (key === keyPattern || key.startsWith(keyPattern)) {
          memoryCache.delete(key);
        }
      } else if (keyPattern instanceof RegExp && keyPattern.test(key)) {
        memoryCache.delete(key);
      }
    }
  },

  /**
   * Clear all cached data (e.g. on logout)
   */
  clear() {
    memoryCache.clear();
  },
};

export default clientCache;

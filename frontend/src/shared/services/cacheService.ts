const CACHE_PREFIX = 'hg_cache_';

export const cacheService = {
  set(key: string, data: any) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
      console.warn('Cache set failed', e);
    }
  },

  get(key: string, maxAge = 3600000) { // default 1 hour
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp > maxAge) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  remove(key: string) {
    localStorage.removeItem(CACHE_PREFIX + key);
  }
};